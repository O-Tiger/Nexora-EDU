"use server";

import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createRegistro, updateRegistro, deleteRegistro } from "@nexora/db/src/queries/diario";
import { prisma } from "@nexora/db";

async function requireStaff() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId, id } = session.user;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "COORDENADOR" && role !== "PROFESSOR") redirect("/unauthorized");
  return { tenantId: activeTenantId, userId: id };
}

const PresencaSchema = z.object({
  enrollmentId: z.string().cuid(),
  status: z.enum(["PRESENTE", "AUSENTE", "JUSTIFICADA"]),
});

const RegistroSchema = z.object({
  turmaId: z.string().cuid(),
  disciplinaId: z.string().cuid(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  quantidadeAulas: z.number().int().min(1).max(10),
  conteudo: z.string().min(1).max(2000),
  observacoes: z.string().max(1000).optional(),
  presencas: z.array(PresencaSchema).max(100),
});

export async function saveRegistroAction(input: unknown) {
  const { tenantId, userId } = await requireStaff();
  const parsed = RegistroSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;

  // Ownership: turma e disciplina pertencem ao tenant
  const [turma, disc] = await Promise.all([
    prisma.turma.findFirst({ where: { id: d.turmaId, tenantId }, select: { id: true } }),
    prisma.disciplina.findFirst({ where: { id: d.disciplinaId, tenantId }, select: { id: true } }),
  ]);
  if (!turma || !disc) return { error: "Turma ou disciplina inválida" };

  await createRegistro({
    tenantId,
    turmaId: d.turmaId,
    disciplinaId: d.disciplinaId,
    data: new Date(d.data),
    quantidadeAulas: d.quantidadeAulas,
    conteudo: d.conteudo,
    createdBy: userId,
    ...(d.observacoes && { observacoes: d.observacoes }),
    presencas: d.presencas,
  });

  revalidatePath(`/admin/secretaria/turmas/${d.turmaId}/diario`);
  return { success: true };
}

const UpdateSchema = RegistroSchema.extend({ id: z.string().cuid() });

export async function updateRegistroAction(input: unknown) {
  const { tenantId } = await requireStaff();
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;

  try {
    await updateRegistro(d.id, tenantId, {
      data: new Date(d.data),
      quantidadeAulas: d.quantidadeAulas,
      conteudo: d.conteudo,
      presencas: d.presencas,
      ...(d.observacoes && { observacoes: d.observacoes }),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Falha ao atualizar" };
  }

  revalidatePath(`/admin/secretaria/turmas/${d.turmaId}/diario`);
  return { success: true };
}

export async function deleteRegistroAction(id: string, turmaId: string) {
  const { tenantId } = await requireStaff();
  await deleteRegistro(id, tenantId);
  revalidatePath(`/admin/secretaria/turmas/${turmaId}/diario`);
  return { success: true };
}
