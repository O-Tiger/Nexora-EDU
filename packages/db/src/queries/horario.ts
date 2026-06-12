import { prisma } from "../client";
import type { TipoEvento } from "@prisma/client";

// ─── Grade de horários ─────────────────────────────────────────────────────────

export async function getHorario(tenantId: string, turmaId: string) {
  return prisma.horarioAula.findMany({
    where: { tenantId, turmaId },
    include: { disciplina: { select: { id: true, name: true } } },
    orderBy: [{ diaSemana: "asc" }, { ordem: "asc" }],
  });
}

/** Substitui toda a grade da turma (slots vazios = ausência de linha). */
export async function setHorario(
  tenantId: string,
  turmaId: string,
  slots: { diaSemana: number; ordem: number; disciplinaId: string }[],
) {
  await prisma.$transaction([
    prisma.horarioAula.deleteMany({ where: { tenantId, turmaId } }),
    prisma.horarioAula.createMany({
      data: slots.map((s) => ({ tenantId, turmaId, diaSemana: s.diaSemana, ordem: s.ordem, disciplinaId: s.disciplinaId })),
    }),
  ]);
}

// ─── Eventos do calendário ─────────────────────────────────────────────────────

export async function getEventos(tenantId: string, turmaId: string) {
  return prisma.eventoCalendario.findMany({
    where: { tenantId, turmaId },
    orderBy: { data: "asc" },
  });
}

export async function createEvento(data: {
  tenantId: string;
  turmaId: string;
  data: Date;
  tipo: TipoEvento;
  titulo: string;
  descricao?: string;
}) {
  return prisma.eventoCalendario.create({ data });
}

export async function deleteEvento(id: string, tenantId: string) {
  return prisma.eventoCalendario.deleteMany({ where: { id, tenantId } });
}
