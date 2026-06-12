"use server";

import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setHorario, createEvento, deleteEvento } from "@nexora/db/src/queries/horario";
import { prisma } from "@nexora/db";

async function requireStaff() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId } = session.user;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "COORDENADOR" && role !== "PROFESSOR") redirect("/unauthorized");
  return { tenantId: activeTenantId };
}

const SlotSchema = z.object({
  diaSemana: z.number().int().min(1).max(7),
  ordem: z.number().int().min(1).max(12),
  disciplinaId: z.string().cuid(),
});

export async function setHorarioAction(turmaId: string, slots: unknown) {
  const { tenantId } = await requireStaff();
  const parsed = z.array(SlotSchema).max(84).safeParse(slots);
  if (!parsed.success) return { error: "Grade inválida" };

  const turma = await prisma.turma.findFirst({ where: { id: turmaId, tenantId }, select: { id: true } });
  if (!turma) return { error: "Turma não encontrada" };

  await setHorario(tenantId, turmaId, parsed.data);
  revalidatePath(`/admin/secretaria/turmas/${turmaId}/horario`);
  return { success: true };
}

const EventoSchema = z.object({
  turmaId: z.string().cuid(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  tipo: z.enum(["PROVA", "SIMULADO", "OLIMPIADA", "TRABALHO", "REUNIAO", "PASSEIO", "FERIADO", "OUTRO"]),
  titulo: z.string().min(1).max(160),
  descricao: z.string().max(1000).optional(),
});

export async function createEventoAction(formData: FormData) {
  const { tenantId } = await requireStaff();
  const parsed = EventoSchema.safeParse({
    turmaId: formData.get("turmaId"),
    data: formData.get("data"),
    tipo: formData.get("tipo"),
    titulo: formData.get("titulo"),
    descricao: formData.get("descricao") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const turma = await prisma.turma.findFirst({ where: { id: parsed.data.turmaId, tenantId }, select: { id: true } });
  if (!turma) return { error: "Turma não encontrada" };

  await createEvento({
    tenantId,
    turmaId: parsed.data.turmaId,
    data: new Date(parsed.data.data),
    tipo: parsed.data.tipo,
    titulo: parsed.data.titulo,
    ...(parsed.data.descricao && { descricao: parsed.data.descricao }),
  });
  revalidatePath(`/admin/secretaria/turmas/${parsed.data.turmaId}/horario`);
  return { success: true };
}

export async function deleteEventoAction(id: string, turmaId: string) {
  const { tenantId } = await requireStaff();
  await deleteEvento(id, tenantId);
  revalidatePath(`/admin/secretaria/turmas/${turmaId}/horario`);
  return { success: true };
}
