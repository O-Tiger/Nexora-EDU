import { prisma } from "../client";
import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";

type Tx = Parameters<Parameters<InstanceType<typeof PrismaClient>["$transaction"]>[0]>[0];

// Modelo de versionamento:
//   - Rascunho   = linha com publishedAt = null e version = 0 (no máximo 1 por página).
//   - Publicadas = linhas com publishedAt definido e version >= 1 (monotônico).
// A página "ao vivo" é a publicada de maior version. Mantemos as 10 mais recentes.

const MAX_VERSIONS = 10;
const DRAFT_VERSION = 0;

type Blocks = Prisma.InputJsonValue;

export async function getDraft(tenantId: string, pageType: string) {
  return prisma.pageLayout.findFirst({
    where: { tenantId, pageType, publishedAt: null },
  });
}

export async function getLatestPublished(tenantId: string, pageType: string) {
  return prisma.pageLayout.findFirst({
    where: { tenantId, pageType, publishedAt: { not: null } },
    orderBy: { version: "desc" },
  });
}

/**
 * Blocos para abrir no editor: rascunho se existir, senão a última publicada.
 */
export async function getEditorBlocks(tenantId: string, pageType: string) {
  const draft = await getDraft(tenantId, pageType);
  if (draft) return { blocks: draft.blocks, source: "draft" as const, updatedAt: draft.updatedAt };

  const published = await getLatestPublished(tenantId, pageType);
  if (published)
    return { blocks: published.blocks, source: "published" as const, updatedAt: published.updatedAt };

  return { blocks: [], source: "empty" as const, updatedAt: null };
}

/** Blocos da versão publicada ao vivo (ou null se a página nunca foi publicada). */
export async function getPublishedBlocks(tenantId: string, pageType: string) {
  const published = await getLatestPublished(tenantId, pageType);
  return published?.blocks ?? null;
}

/** Histórico das versões publicadas (mais recentes primeiro). */
export async function listVersions(tenantId: string, pageType: string, take = MAX_VERSIONS) {
  return prisma.pageLayout.findMany({
    where: { tenantId, pageType, publishedAt: { not: null } },
    orderBy: { version: "desc" },
    take,
    select: { id: true, version: true, publishedAt: true, updatedBy: true, updatedAt: true },
  });
}

/** Salva (cria ou substitui) o rascunho da página. */
export async function saveDraft(
  tenantId: string,
  pageType: string,
  blocks: Blocks,
  userId: string,
) {
  const existing = await getDraft(tenantId, pageType);
  if (existing) {
    return prisma.pageLayout.update({
      where: { id: existing.id },
      data: { blocks, updatedBy: userId },
    });
  }
  return prisma.pageLayout.create({
    data: { tenantId, pageType, version: DRAFT_VERSION, blocks, updatedBy: userId, publishedAt: null },
  });
}

/**
 * Publica um conjunto de blocos como uma nova versão, remove o rascunho e
 * poda versões antigas além das 10 mais recentes. Tudo numa transação.
 */
export async function publishBlocks(
  tenantId: string,
  pageType: string,
  blocks: Blocks,
  userId: string,
) {
  return prisma.$transaction(async (tx: Tx) => {
    const max = await tx.pageLayout.aggregate({
      where: { tenantId, pageType, publishedAt: { not: null } },
      _max: { version: true },
    });
    const nextVersion = (max._max.version ?? 0) + 1;

    const created = await tx.pageLayout.create({
      data: {
        tenantId,
        pageType,
        version: nextVersion,
        blocks,
        publishedAt: new Date(),
        updatedBy: userId,
      },
    });

    // Remove o rascunho — ele virou esta versão publicada.
    await tx.pageLayout.deleteMany({ where: { tenantId, pageType, publishedAt: null } });

    // Poda: mantém apenas as MAX_VERSIONS publicadas mais recentes.
    const keep = await tx.pageLayout.findMany({
      where: { tenantId, pageType, publishedAt: { not: null } },
      orderBy: { version: "desc" },
      take: MAX_VERSIONS,
      select: { id: true },
    });
    await tx.pageLayout.deleteMany({
      where: {
        tenantId,
        pageType,
        publishedAt: { not: null },
        id: { notIn: keep.map((k: { id: string }) => k.id) },
      },
    });

    return created;
  });
}

/**
 * Restaura uma versão antiga republicando seus blocos como uma nova versão.
 * Preserva o histórico (não apaga nem reativa a versão antiga).
 * Retorna a nova versão criada, ou null se a versão alvo não existir.
 */
export async function rollbackToVersion(
  tenantId: string,
  pageType: string,
  version: number,
  userId: string,
) {
  const target = await prisma.pageLayout.findFirst({
    where: { tenantId, pageType, version, publishedAt: { not: null } },
  });
  if (!target) return null;

  return publishBlocks(tenantId, pageType, target.blocks as Blocks, userId);
}
