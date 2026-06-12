import { prisma } from "../client";

/** Presença com faltas parciais. Só persistimos alunos com alguma falta. */
export type PresencaInput = { enrollmentId: string; faltas: number; justificadas: number };

// ─── Registros de aula ─────────────────────────────────────────────────────────

export async function getRegistros(tenantId: string, turmaId: string, disciplinaId?: string) {
  return prisma.registroAula.findMany({
    where: { tenantId, turmaId, ...(disciplinaId && { disciplinaId }) },
    include: {
      disciplina: { select: { id: true, name: true } },
      _count: { select: { presencas: true } },
    },
    orderBy: { data: "desc" },
  });
}

export async function getRegistroById(tenantId: string, id: string) {
  return prisma.registroAula.findFirst({
    where: { id, tenantId },
    include: {
      disciplina: { select: { id: true, name: true } },
      presencas: true,
    },
  });
}

export async function createRegistro(data: {
  tenantId: string;
  turmaId: string;
  disciplinaId: string;
  data: Date;
  quantidadeAulas: number;
  conteudo: string;
  observacoes?: string;
  createdBy: string;
  presencas: PresencaInput[];
}) {
  const { presencas, ...registro } = data;
  // Só persiste alunos com alguma falta (presença total = ausência de linha)
  const comFalta = presencas.filter((p) => p.faltas > 0 || p.justificadas > 0);
  return prisma.registroAula.create({
    data: {
      ...registro,
      presencas: {
        create: comFalta.map((p) => ({ enrollmentId: p.enrollmentId, faltas: p.faltas, justificadas: p.justificadas })),
      },
    },
  });
}

export async function updateRegistro(
  id: string,
  tenantId: string,
  data: {
    data: Date;
    quantidadeAulas: number;
    conteudo: string;
    observacoes?: string;
    presencas: PresencaInput[];
  },
) {
  // Verifica ownership antes de mutar
  const exists = await prisma.registroAula.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!exists) throw new Error("Registro não encontrado");

  const comFalta = data.presencas.filter((p) => p.faltas > 0 || p.justificadas > 0);

  return prisma.$transaction([
    prisma.registroAula.update({
      where: { id },
      data: {
        data: data.data,
        quantidadeAulas: data.quantidadeAulas,
        conteudo: data.conteudo,
        observacoes: data.observacoes ?? null,
      },
    }),
    prisma.presencaAluno.deleteMany({ where: { registroId: id } }),
    prisma.presencaAluno.createMany({
      data: comFalta.map((p) => ({ registroId: id, enrollmentId: p.enrollmentId, faltas: p.faltas, justificadas: p.justificadas })),
    }),
  ]);
}

export async function deleteRegistro(id: string, tenantId: string) {
  return prisma.registroAula.deleteMany({ where: { id, tenantId } });
}

/**
 * Soma faltas (não justificadas) por aluno e disciplina a partir do diário.
 * Justificadas não contam. Retorna Map<`${enrollmentId}|${disciplinaId}`, faltas>.
 * Vazio quando não há diário lançado (boletim cai no fallback manual).
 */
export async function getFaltasFromDiario(
  tenantId: string,
  turmaId: string,
): Promise<Map<string, number>> {
  const registros = await prisma.registroAula.findMany({
    where: { tenantId, turmaId },
    select: {
      disciplinaId: true,
      presencas: { where: { faltas: { gt: 0 } }, select: { enrollmentId: true, faltas: true } },
    },
  });

  const faltas = new Map<string, number>();
  for (const r of registros) {
    for (const p of r.presencas) {
      const key = `${p.enrollmentId}|${r.disciplinaId}`;
      faltas.set(key, (faltas.get(key) ?? 0) + p.faltas);
    }
  }
  return faltas;
}
