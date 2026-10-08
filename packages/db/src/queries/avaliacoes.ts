import { prisma } from "../client";
import type { TipoAvaliacao } from "@prisma/client";

export type AvaliacaoConfigRow = {
  id: string;
  tenantId: string;
  sigla: string;
  label: string;
  periodo: number;
  isRecuperacao: boolean;
  tipo: TipoAvaliacao;
  peso: number | null;
  obrigatoria: boolean;
  ordem: number;
};

export async function getAvaliacoesConfig(tenantId: string): Promise<AvaliacaoConfigRow[]> {
  return prisma.avaliacaoConfig.findMany({
    where: { tenantId },
    orderBy: { ordem: "asc" },
  });
}

export async function upsertAvaliacaoConfig(
  tenantId: string,
  data: {
    id?: string;
    sigla: string;
    label: string;
    periodo: number;
    isRecuperacao: boolean;
    tipo: TipoAvaliacao;
    peso?: number | null;
    obrigatoria: boolean;
    ordem: number;
  },
) {
  if (data.id) {
    return prisma.avaliacaoConfig.update({
      where: { id: data.id, tenantId },
      data: {
        sigla: data.sigla,
        label: data.label,
        periodo: data.periodo,
        isRecuperacao: data.isRecuperacao,
        tipo: data.tipo,
        peso: data.peso ?? null,
        obrigatoria: data.obrigatoria,
        ordem: data.ordem,
      },
    });
  }
  return prisma.avaliacaoConfig.create({
    data: {
      tenantId,
      sigla: data.sigla,
      label: data.label,
      periodo: data.periodo,
      isRecuperacao: data.isRecuperacao,
      tipo: data.tipo,
      peso: data.peso ?? null,
      obrigatoria: data.obrigatoria,
      ordem: data.ordem,
    },
  });
}

export async function deleteAvaliacaoConfig(id: string, tenantId: string) {
  return prisma.avaliacaoConfig.delete({ where: { id, tenantId } });
}

export async function reorderAvaliacaoConfigs(
  tenantId: string,
  orderedIds: string[],
) {
  return prisma.$transaction(
    orderedIds.map((id, idx) =>
      prisma.avaliacaoConfig.update({
        where: { id, tenantId },
        data: { ordem: idx + 1 },
      }),
    ),
  );
}
