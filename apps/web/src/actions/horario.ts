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

const TimeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
const ConfigSchema = z.object({
  slots: z.array(z.object({
    ordem: z.number().int().min(1).max(12),
    inicio: z.string().regex(TimeRe).or(z.literal("")),
    fim: z.string().regex(TimeRe).or(z.literal("")),
  })).max(12),
  sabado: z.boolean(),
});

export async function setHorarioAction(turmaId: string, input: unknown) {
  const { tenantId } = await requireStaff();
  const schema = z.object({ slots: z.array(SlotSchema).max(84), config: ConfigSchema });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Grade inválida" };

  const turma = await prisma.turma.findFirst({ where: { id: turmaId, tenantId }, select: { id: true } });
  if (!turma) return { error: "Turma não encontrada" };

  await setHorario(tenantId, turmaId, parsed.data.slots, parsed.data.config);
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
