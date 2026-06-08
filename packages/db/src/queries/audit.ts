import { prisma } from "../client";
import type { Prisma } from "@prisma/client";

/**
 * Registra uma ação no log de auditoria imutável.
 * Nunca lança para o chamador: uma falha de auditoria não deve quebrar a ação
 * de negócio, mas DEVE aparecer nos logs do servidor.
 */
export async function createAuditLog(
  tenantId: string,
  userId: string,
  action: string,
  resource?: string,
  meta?: Prisma.InputJsonValue,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        ...(resource ? { resource } : {}),
        ...(meta !== undefined ? { meta } : {}),
      },
    });
  } catch (e) {
    console.error("[audit.createAuditLog] Falha ao registrar auditoria:", action, e);
  }
}

export async function getAuditLogs(
  tenantId: string,
  opts: { action?: string; limit?: number } = {},
) {
  const limit = Math.min(opts.limit ?? 50, 200);
  return prisma.auditLog.findMany({
    where: { tenantId, ...(opts.action ? { action: opts.action } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, email: true } } },
  });
}
