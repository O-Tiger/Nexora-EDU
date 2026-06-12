"use server";

import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createDisciplina, deleteDisciplina, setTurmaDisciplinas,
  upsertGrade, upsertAttendance,
  updateDisciplinaColor, setTurmaDisciplinaProfessor,
} from "@nexora/db/src/queries/pedagogico";
import type { GradeKind } from "@nexora/db";

async function requireStaff() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId, id } = session.user;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "COORDENADOR" && role !== "PROFESSOR") redirect("/unauthorized");
  return { tenantId: activeTenantId, userId: id };
}

const DisciplinaSchema = z.object({
  name: z.string().min(1).max(80),
  parentId: z.string().cuid().optional(),
  position: z.number().int().min(0).max(999).default(0),
});

export async function createDisciplinaAction(formData: FormData) {
  const { tenantId } = await requireStaff();
  const parsed = DisciplinaSchema.safeParse({
    name: formData.get("name"),
    parentId: formData.get("parentId") || undefined,
    position: Number(formData.get("position") ?? 0),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  await createDisciplina({
    tenantId,
    name: parsed.data.name,
    position: parsed.data.position,
    ...(parsed.data.parentId && { parentId: parsed.data.parentId }),
  });
  revalidatePath("/admin/secretaria/disciplinas");
  return { success: true };
}

export async function deleteDisciplinaAction(id: string) {
  const { tenantId } = await requireStaff();
  await deleteDisciplina(id, tenantId);
  revalidatePath("/admin/secretaria/disciplinas");
  return { success: true };
}

export async function setDisciplinaColorAction(id: string, color: string | null) {
  const { tenantId } = await requireStaff();
  if (color !== null && !/^#[0-9a-fA-F]{6}$/.test(color)) return { error: "Cor inválida" };
  await updateDisciplinaColor(id, tenantId, color);
  revalidatePath("/admin/secretaria/disciplinas");
  return { success: true };
}

export async function setTurmaDisciplinaProfessorAction(
  turmaId: string,
  disciplinaId: string,
  professorId: string | null,
) {
  const { tenantId } = await requireStaff();
  await setTurmaDisciplinaProfessor(tenantId, turmaId, disciplinaId, professorId);
  revalidatePath(`/admin/secretaria/turmas/${turmaId}/horario`);
  return { success: true };
}

export async function setTurmaDisciplinasAction(turmaId: string, disciplinaIds: string[]) {
  const { tenantId } = await requireStaff();
  await setTurmaDisciplinas(tenantId, turmaId, disciplinaIds);
  revalidatePath(`/admin/secretaria/turmas/${turmaId}/notas`);
  revalidatePath(`/admin/secretaria/turmas/${turmaId}`);
  return { success: true };
}

const GradeSchema = z.object({
  enrollmentId: z.string().cuid(),
  disciplinaId: z.string().cuid(),
  period: z.number().int().min(0).max(3),
  kind: z.enum(["AVA", "RECP", "FINAL"]),
  score: z.number().min(0).max(10).nullable(),
});

export async function saveGradeAction(input: {
  enrollmentId: string;
  disciplinaId: string;
  period: number;
  kind: GradeKind;
  score: number | null;
}) {
  const { tenantId, userId } = await requireStaff();
  const parsed = GradeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Nota inválida" };

  await upsertGrade({ tenantId, updatedBy: userId, ...parsed.data });
  return { success: true };
}

export async function saveAttendanceAction(input: {
  enrollmentId: string;
  disciplinaId: string;
  absences: number;
}) {
  const { tenantId } = await requireStaff();
  if (input.absences < 0 || input.absences > 999) return { error: "Faltas inválidas" };
  await upsertAttendance({ tenantId, ...input });
  return { success: true };
}
