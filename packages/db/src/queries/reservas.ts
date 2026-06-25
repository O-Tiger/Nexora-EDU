import { prisma } from "../client";
import type { Prisma, ReservaStatus } from "@prisma/client";

export type ReservaComDetalhes = Prisma.ReservaVagaGetPayload<{
  include: {
    student: { select: { id: true; name: true; email: true } };
    turmaAtual: { select: { code: true; etapa: true; ano: true } };
    turmaProxima: { select: { code: true; etapa: true; ano: true } };
  };
}>;

export async function getReservasByAnoLetivo(
  tenantId: string,
  anoLetivoAtualId: string,
  status?: ReservaStatus,
): Promise<ReservaComDetalhes[]> {
  return prisma.reservaVaga.findMany({
    where: { tenantId, anoLetivoAtualId, ...(status && { status }) },
    include: {
      student: { select: { id: true, name: true, email: true } },
      turmaAtual: { select: { code: true, etapa: true, ano: true } },
      turmaProxima: { select: { code: true, etapa: true, ano: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getReservaByStudent(_tenantId: string, studentId: string, anoLetivoAtualId: string) {
  return prisma.reservaVaga.findUnique({
    where: { studentId_anoLetivoAtualId: { studentId, anoLetivoAtualId } },
    include: {
      turmaAtual: true,
      turmaProxima: true,
    },
  });
}

export async function createReserva(data: {
  tenantId: string;
  studentId: string;
  anoLetivoAtualId: string;
  turmaAtualId: string;
  turmaProximaId: string;
  mensalidadeId?: string;
  entrevistaAt?: Date;
  notes?: string;
  createdBy: string;
}) {
  return prisma.reservaVaga.create({ data });
}

export async function updateReservaStatus(
  _tenantId: string,
  id: string,
  data: {
    status: ReservaStatus;
    mensalidadeId?: string;
    confirmedAt?: Date;
    cancelledAt?: Date;
    cancelReason?: string;
  },
) {
  return prisma.reservaVaga.update({ where: { id }, data });
}

export async function getReservaByMensalidadeId(mensalidadeId: string) {
  return prisma.reservaVaga.findFirst({ where: { mensalidadeId } });
}

export async function getReservasOverview(tenantId: string, anoLetivoAtualId: string) {
  const [total, pagas, confirmadas, canceladas, pendentes] = await Promise.all([
    prisma.reservaVaga.count({ where: { tenantId, anoLetivoAtualId } }),
    prisma.reservaVaga.count({ where: { tenantId, anoLetivoAtualId, status: "PAGA" } }),
    prisma.reservaVaga.count({ where: { tenantId, anoLetivoAtualId, status: "CONFIRMADA" } }),
    prisma.reservaVaga.count({ where: { tenantId, anoLetivoAtualId, status: "CANCELADA" } }),
    prisma.reservaVaga.count({ where: { tenantId, anoLetivoAtualId, status: "PENDENTE" } }),
  ]);
  return { total, pagas, confirmadas, canceladas, pendentes };
}
