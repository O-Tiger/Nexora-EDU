import { prisma } from "../client";
import type { PresencaStatus } from "@prisma/client";

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
  presencas: { enrollmentId: string; status: PresencaStatus }[];
}) {
  const { presencas, ...registro } = data;
  return prisma.registroAula.create({
    data: {
      ...registro,
      presencas: { create: presencas.map((p) => ({ enrollmentId: p.enrollmentId, status: p.status })) },
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
    presencas: { enrollmentId: string; status: PresencaStatus }[];
  },
) {
  // Verifica ownership antes de mutar
  const exists = await prisma.registroAula.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!exists) throw new Error("Registro não encontrado");

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
      data: data.presencas.map((p) => ({ registroId: id, enrollmentId: p.enrollmentId, status: p.status })),
    }),
  ]);
}

export async function deleteRegistro(id: string, tenantId: string) {
  return prisma.registroAula.deleteMany({ where: { id, tenantId } });
}

/**
 * Conta faltas por aluno e disciplina a partir do diário de classe.
 * Falta = soma de quantidadeAulas dos registros em que o aluno está AUSENTE
 * (JUSTIFICADA não conta). Retorna Map<`${enrollmentId}|${disciplinaId}`, faltas>.
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
      quantidadeAulas: true,
      presencas: { where: { status: "AUSENTE" }, select: { enrollmentId: true } },
    },
  });

  const faltas = new Map<string, number>();
  for (const r of registros) {
    for (const p of r.presencas) {
      const key = `${p.enrollmentId}|${r.disciplinaId}`;
      faltas.set(key, (faltas.get(key) ?? 0) + r.quantidadeAulas);
    }
  }
  return faltas;
}
