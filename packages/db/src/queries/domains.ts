import { prisma } from "../client";

/** Normaliza um host: minúsculas, sem protocolo, sem porta, sem barra final. */
export function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "");
  d = d.split("/")[0] ?? d;
  d = d.split(":")[0] ?? d; // remove porta
  return d;
}

/** Resolve o tenant a partir de um host público. Retorna null se não mapeado. */
export async function getTenantByDomain(host: string): Promise<string | null> {
  const domain = normalizeDomain(host);
  if (!domain) return null;
  const row = await prisma.tenantDomain.findUnique({ where: { domain }, select: { tenantId: true } });
  return row?.tenantId ?? null;
}

export async function getDomainsByTenant(tenantId: string) {
  return prisma.tenantDomain.findMany({
    where: { tenantId },
    orderBy: [{ isPrimary: "desc" }, { domain: "asc" }],
  });
}

export async function addDomain(tenantId: string, domain: string, isPrimary: boolean) {
  const normalized = normalizeDomain(domain);
  if (isPrimary) {
    await prisma.tenantDomain.updateMany({ where: { tenantId, isPrimary: true }, data: { isPrimary: false } });
  }
  return prisma.tenantDomain.create({ data: { tenantId, domain: normalized, isPrimary } });
}

export async function removeDomain(id: string, tenantId: string) {
  return prisma.tenantDomain.deleteMany({ where: { id, tenantId } });
}
