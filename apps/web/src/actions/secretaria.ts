"use server";

import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@nexora/db";
import { z } from "zod";
import {
  UnidadeSchema, AnoLetivoSchema, TurmaSchema, TurmaEnrollmentSchema, GuardianSchema,
  buildTurmaCode,
} from "@nexora/validators";
import {
  createUnidade, updateUnidade, deleteUnidade,
  createAnoLetivo, updateAnoLetivoStatus, deleteAnoLetivo,
  createTurma, deleteTurma,
  enrollStudentInTurma, updateTurmaEnrollmentStatus,
  createGuardian, deleteGuardian,
} from "@nexora/db/src/queries/secretaria";
import { createAuditLog } from "@nexora/db/src/queries/audit";

async function requireAdmin() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId, id } = session.user;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "COORDENADOR") redirect("/unauthorized");
  return { tenantId: activeTenantId, userId: id };
}

// ─── Unidades ─────────────────────────────────────────────────────────────────

export async function createUnidadeAction(formData: FormData) {
  const { tenantId, userId } = await requireAdmin();
  const parsed = UnidadeSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    gender: formData.get("gender"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  await createUnidade({ tenantId, ...parsed.data });
  await createAuditLog(tenantId, userId, "secretaria.unidade_created", undefined, { name: parsed.data.name });
  revalidatePath("/admin/secretaria");
  return { success: true };
}

export async function toggleUnidadeAction(id: string, active: boolean) {
  const { tenantId } = await requireAdmin();
  await updateUnidade(id, tenantId, { active });
  revalidatePath("/admin/secretaria");
}

export async function deleteUnidadeAction(id: string) {
  const { tenantId } = await requireAdmin();
  try {
    await deleteUnidade(id, tenantId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Falha ao excluir unidade" };
  }
  revalidatePath("/admin/secretaria");
  revalidatePath("/admin/secretaria/unidades");
  return { success: true };
}

// ─── Anos letivos ─────────────────────────────────────────────────────────────

export async function createAnoLetivoAction(formData: FormData) {
  const { tenantId, userId } = await requireAdmin();
  const parsed = AnoLetivoSchema.safeParse({
    year: Number(formData.get("year")),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const { year, startDate, endDate } = parsed.data;
  await createAnoLetivo({
    tenantId,
    year,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });
  await createAuditLog(tenantId, userId, "secretaria.ano_letivo_created", undefined, { year });
  revalidatePath("/admin/secretaria");
  return { success: true };
}

export async function updateAnoLetivoStatusAction(id: string, status: "PLANEJADO" | "EM_ANDAMENTO" | "ENCERRADO") {
  const { tenantId } = await requireAdmin();
  await updateAnoLetivoStatus(id, tenantId, status);
  revalidatePath("/admin/secretaria");
}

export async function deleteAnoLetivoAction(id: string) {
  const { tenantId } = await requireAdmin();
  try {
    await deleteAnoLetivo(id, tenantId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Falha ao excluir ano letivo" };
  }
  revalidatePath("/admin/secretaria");
  return { success: true };
}

// ─── Turmas ───────────────────────────────────────────────────────────────────

export async function createTurmaAction(formData: FormData) {
  const { tenantId, userId } = await requireAdmin();
  const parsed = TurmaSchema.safeParse({
    unidadeId:   formData.get("unidadeId"),
    anoLetivoId: formData.get("anoLetivoId"),
    etapa:       formData.get("etapa"),
    ano:         Number(formData.get("ano")),
    letra:       formData.get("letra"),
    periodo:     formData.get("periodo"),
    maxStudents: Number(formData.get("maxStudents") ?? 35),
    etapaPrefix: formData.get("etapaPrefix"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const { etapaPrefix, ...rest } = parsed.data;

  // Resolve unidade code for code generation
  const unidade = await prisma.unidade.findFirst({ where: { id: rest.unidadeId, tenantId } });
  if (!unidade) return { error: "Unidade não encontrada" };

  const code = buildTurmaCode({
    etapaPrefix,
    ano: rest.ano,
    letra: rest.letra,
    unidadeCode: unidade.code,
  });

  // Check uniqueness
  const existing = await prisma.turma.findFirst({
    where: { tenantId, anoLetivoId: rest.anoLetivoId, code },
  });
  if (existing) return { error: `Já existe uma turma com o código "${code}" neste ano letivo.` };

  await createTurma({ tenantId, code, ...rest });
  await createAuditLog(tenantId, userId, "secretaria.turma_created", undefined, { code });
  revalidatePath("/admin/secretaria/turmas");
  revalidatePath(`/admin/secretaria/unidades/${rest.unidadeId}`);
  return { success: true, code };
}

export async function deleteTurmaAction(id: string) {
  const { tenantId } = await requireAdmin();
  try {
    await deleteTurma(id, tenantId);
  } catch (err) {
    return { error: String(err) };
  }
  revalidatePath("/admin/secretaria/turmas");
  return { success: true };
}

// ─── Matrículas K-12 ──────────────────────────────────────────────────────────

export async function enrollStudentAction(formData: FormData) {
  const { tenantId, userId } = await requireAdmin();
  const parsed = TurmaEnrollmentSchema.safeParse({
    studentId:   formData.get("studentId"),
    turmaId:     formData.get("turmaId"),
    anoLetivoId: formData.get("anoLetivoId"),
    notes:       formData.get("notes") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  // Check student belongs to this tenant
  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: parsed.data.studentId, tenantId, active: true },
  });
  if (!membership) return { error: "Aluno não encontrado neste tenant" };

  // Check turma capacity
  const turma = await prisma.turma.findFirst({ where: { id: parsed.data.turmaId, tenantId } });
  if (!turma) return { error: "Turma não encontrada" };

  const count = await prisma.turmaEnrollment.count({
    where: { turmaId: parsed.data.turmaId, status: "ATIVA" },
  });
  if (count >= turma.maxStudents) return { error: "Turma já atingiu o limite de alunos." };

  try {
    await enrollStudentInTurma({
      tenantId,
      studentId: parsed.data.studentId,
      turmaId: parsed.data.turmaId,
      anoLetivoId: parsed.data.anoLetivoId,
      ...(parsed.data.notes != null && { notes: parsed.data.notes }),
    });
  } catch {
    return { error: "Aluno já possui matrícula ativa neste ano letivo." };
  }

  await createAuditLog(tenantId, userId, "secretaria.student_enrolled", `turma:${parsed.data.turmaId}`, {
    studentId: parsed.data.studentId,
  });
  revalidatePath(`/admin/secretaria/turmas/${parsed.data.turmaId}`);
  return { success: true };
}

export async function updateEnrollmentStatusAction(id: string, status: "ATIVA" | "TRANSFERIDA" | "CANCELADA" | "CONCLUIDA") {
  const { tenantId } = await requireAdmin();
  await updateTurmaEnrollmentStatus(id, tenantId, status);
  revalidatePath("/admin/secretaria/turmas");
  return { success: true };
}

// ─── Responsáveis ─────────────────────────────────────────────────────────────

export async function createGuardianAction(formData: FormData) {
  const { tenantId } = await requireAdmin();
  const parsed = GuardianSchema.safeParse({
    studentId:    formData.get("studentId"),
    name:         formData.get("name"),
    email:        formData.get("email") || undefined,
    phone:        formData.get("phone") || undefined,
    cpf:          formData.get("cpf") || undefined,
    relationship: formData.get("relationship"),
    isPrimary:    formData.get("isPrimary") === "true",
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  // Verify student belongs to tenant
  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: parsed.data.studentId, tenantId, active: true },
  });
  if (!membership) return { error: "Aluno não encontrado" };

  await createGuardian({
    tenantId,
    studentId: parsed.data.studentId,
    name: parsed.data.name,
    relationship: parsed.data.relationship,
    isPrimary: parsed.data.isPrimary,
    ...(parsed.data.email && { email: parsed.data.email }),
    ...(parsed.data.phone && { phone: parsed.data.phone }),
    ...(parsed.data.cpf && { cpf: parsed.data.cpf }),
  });
  revalidatePath(`/admin/secretaria/alunos/${parsed.data.studentId}`);
  return { success: true };
}

export async function deleteGuardianAction(id: string, studentId: string) {
  const { tenantId } = await requireAdmin();
  await deleteGuardian(id, tenantId);
  revalidatePath(`/admin/secretaria/alunos/${studentId}`);
  return { success: true };
}
