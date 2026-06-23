import { prisma } from "../client";
import type { TipoEvento, Prisma, FrequenciaAula } from "@prisma/client";

export type HorarioSlotConfig = { ordem: number; inicio: string; fim: string };
export type HorarioConfig = { slots: HorarioSlotConfig[]; sabado: boolean };

// ─── Grade de horários ─────────────────────────────────────────────────────────

export async function getHorario(tenantId: string, turmaId: string) {
  return prisma.horarioAula.findMany({
    where: { tenantId, turmaId },
    include: { disciplina: { select: { id: true, name: true, color: true } } },
    orderBy: [{ diaSemana: "asc" }, { ordem: "asc" }],
  });
}

/** Substitui a grade da turma e salva a config de horários (slots/sábado). */
export async function setHorario(
  tenantId: string,
  turmaId: string,
  slots: { diaSemana: number; ordem: number; disciplinaId: string; frequencia?: FrequenciaAula }[],
  config: HorarioConfig,
) {
  await prisma.$transaction([
    prisma.horarioAula.deleteMany({ where: { tenantId, turmaId } }),
    prisma.horarioAula.createMany({
      data: slots.map((s) => ({
        tenantId, turmaId,
        diaSemana: s.diaSemana,
        ordem: s.ordem,
        disciplinaId: s.disciplinaId,
        frequencia: s.frequencia ?? "SEMANAL",
      })),
    }),
    prisma.turma.update({ where: { id: turmaId }, data: { horarioConfig: config as unknown as Prisma.InputJsonValue } }),
  ]);
}

/** Dados completos para renderizar a grade (cores + professor + horários). */
export async function getHorarioRenderData(tenantId: string, turmaId: string) {
  const turma = await prisma.turma.findFirst({
    where: { id: turmaId, tenantId },
    include: {
      unidade: { select: { name: true } },
      anoLetivo: { select: { year: true } },
      horarios: { include: { disciplina: { select: { id: true, name: true, color: true } } } },
      disciplinas: {
        include: {
          disciplina: { select: { id: true, name: true, color: true } },
          professor: { select: { name: true } },
        },
      },
    },
  });
  if (!turma) return null;

  const professorByDisc = new Map<string, string>();
  for (const td of turma.disciplinas) {
    if (td.professor?.name) professorByDisc.set(td.disciplinaId, td.professor.name);
  }

  return {
    turma: {
      code: turma.code,
      unidadeName: turma.unidade.name,
      year: turma.anoLetivo.year,
      config: (turma.horarioConfig as unknown as HorarioConfig | null) ?? { slots: [], sabado: false },
    },
    slots: turma.horarios.map((h) => ({
      diaSemana: h.diaSemana,
      ordem: h.ordem,
      disciplinaName: h.disciplina.name,
      color: h.disciplina.color,
      professor: professorByDisc.get(h.disciplinaId) ?? null,
      frequencia: h.frequencia,
    })),
  };
}

// ─── Eventos do calendário ─────────────────────────────────────────────────────

export async function getEventos(tenantId: string, turmaId: string) {
  return prisma.eventoCalendario.findMany({
    where: { tenantId, turmaId },
    orderBy: { data: "asc" },
  });
}

/** Slots mínimos para o diário filtrar por paridade semanal. */
export async function getHorarioSlotsForDiario(tenantId: string, turmaId: string) {
  return prisma.horarioAula.findMany({
    where: { tenantId, turmaId },
    select: { disciplinaId: true, diaSemana: true, frequencia: true },
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
