import { prisma } from "../client";
import type { MensalidadeStatus, OmieSyncStatus, Prisma } from "@prisma/client";

// ─── PLANOS DE COBRANÇA ───────────────────────────────────────────────────────

export async function getPlanosByAnoLetivo(tenantId: string, anoLetivoId: string) {
  return prisma.planoCobranca.findMany({
    where: { tenantId, anoLetivoId },
    include: { turma: { select: { code: true, etapa: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function getPlanoById(tenantId: string, id: string) {
  return prisma.planoCobranca.findFirst({ where: { id, tenantId } });
}

export async function createPlanoCobranca(tenantId: string, data: {
  anoLetivoId: string;
  turmaId?: string | null;
  nome: string;
  valorCents: number;
  vencimentoDia: number;
  meses: number[];
}) {
  return prisma.planoCobranca.create({ data: { ...data, tenantId } });
}

export async function updatePlanoCobranca(_tenantId: string, id: string, data: {
  nome?: string;
  valorCents?: number;
  vencimentoDia?: number;
  meses?: number[];
  ativo?: boolean;
}) {
  return prisma.planoCobranca.update({ where: { id }, data });
}

export async function deletePlanoCobranca(tenantId: string, id: string) {
  // Bloqueia se houver mensalidades geradas
  const count = await prisma.mensalidade.count({ where: { planoId: id, tenantId } });
  if (count > 0) throw new Error("Plano com mensalidades geradas não pode ser excluído");
  return prisma.planoCobranca.delete({ where: { id } });
}

// ─── MENSALIDADES ─────────────────────────────────────────────────────────────

export type MensalidadeComAluno = Prisma.MensalidadeGetPayload<{
  include: { student: { select: { id: true; name: true; email: true } }; plano: { select: { nome: true } } };
}>;

export async function getMensalidadesByAnoLetivo(
  tenantId: string,
  anoLetivoId: string,
  filters?: { status?: MensalidadeStatus; mes?: number; planoId?: string },
): Promise<MensalidadeComAluno[]> {
  return prisma.mensalidade.findMany({
    where: {
      tenantId,
      anoLetivoId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.mes && { mes: filters.mes }),
      ...(filters?.planoId && { planoId: filters.planoId }),
    },
    include: {
      student: { select: { id: true, name: true, email: true } },
      plano: { select: { nome: true } },
    },
    orderBy: [{ ano: "asc" }, { mes: "asc" }, { student: { name: "asc" } }],
  });
}

export async function getMensalidadesByStudent(tenantId: string, studentId: string, anoLetivoId?: string) {
  return prisma.mensalidade.findMany({
    where: { tenantId, studentId, ...(anoLetivoId && { anoLetivoId }) },
    include: { plano: { select: { nome: true } } },
    orderBy: [{ ano: "asc" }, { mes: "asc" }],
  });
}

export async function getFinanceiroOverview(tenantId: string, anoLetivoId: string) {
  const [total, pagas, vencidas, pendentes] = await Promise.all([
    prisma.mensalidade.count({ where: { tenantId, anoLetivoId } }),
    prisma.mensalidade.count({ where: { tenantId, anoLetivoId, status: "PAGA" } }),
    prisma.mensalidade.count({ where: { tenantId, anoLetivoId, status: "VENCIDA" } }),
    prisma.mensalidade.count({ where: { tenantId, anoLetivoId, status: "PENDENTE" } }),
  ]);

  const valorTotal = await prisma.mensalidade.aggregate({
    where: { tenantId, anoLetivoId },
    _sum: { valorCents: true },
  });

  const valorRecebido = await prisma.mensalidade.aggregate({
    where: { tenantId, anoLetivoId, status: "PAGA" },
    _sum: { valorCents: true },
  });

  return {
    total,
    pagas,
    vencidas,
    pendentes,
    valorTotalCents: valorTotal._sum.valorCents ?? 0,
    valorRecebidoCents: valorRecebido._sum.valorCents ?? 0,
  };
}

export async function upsertMensalidade(tenantId: string, data: {
  studentId: string;
  planoId: string;
  anoLetivoId: string;
  mes: number;
  ano: number;
  valorCents: number;
  vencimento: Date;
}) {
  return prisma.mensalidade.upsert({
    where: { studentId_planoId_mes_ano: { studentId: data.studentId, planoId: data.planoId, mes: data.mes, ano: data.ano } },
    create: { ...data, tenantId },
    update: {},
  });
}

export async function updateMensalidadeStatus(
  _tenantId: string,
  id: string,
  data: { status: MensalidadeStatus; paidAt?: Date | null; descontoCents?: number },
) {
  return prisma.mensalidade.update({ where: { id }, data });
}

export async function updateMensalidadeOmie(
  id: string,
  data: { omieClientId?: string; omieReceivableId?: string; omieSyncStatus: OmieSyncStatus; omieError?: string | null },
) {
  return prisma.mensalidade.update({ where: { id }, data });
}

export async function markVencidas(tenantId: string) {
  const hoje = new Date();
  return prisma.mensalidade.updateMany({
    where: { tenantId, status: "PENDENTE", vencimento: { lt: hoje } },
    data: { status: "VENCIDA" },
  });
}

export async function getInadimplentes(tenantId: string, anoLetivoId: string) {
  return prisma.mensalidade.findMany({
    where: { tenantId, anoLetivoId, status: { in: ["VENCIDA", "PENDENTE"] } },
    include: { student: { select: { id: true, name: true, email: true } }, plano: { select: { nome: true } } },
    orderBy: [{ vencimento: "asc" }],
  });
}
