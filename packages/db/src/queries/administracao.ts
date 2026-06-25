import { prisma } from "../index";
import type { Role } from "@prisma/client";

export const STAFF_ROLES: Role[] = ["ADMINISTRATOR", "TI_SUPPORT", "OWNER"];

export type StaffMember = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: Date;
};

export async function getStaffByTenant(tenantId: string): Promise<StaffMember[]> {
  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId, role: { in: STAFF_ROLES }, user: { anonymizedAt: null } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({
    membershipId: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    active: m.active,
    createdAt: m.createdAt,
  }));
}

export async function getTenantConfig(tenantId: string) {
  return prisma.tenantConfig.findUnique({ where: { tenantId } });
}

export async function upsertTenantConfig(
  tenantId: string,
  data: {
    schoolName?: string | null;
    schoolAddress?: string | null;
    cnpj?: string | null;
    logoUrl?: string | null;
    emailDomain?: string | null;
    emailTemplate?: string | null;
  },
) {
  return prisma.tenantConfig.upsert({
    where: { tenantId },
    create: { tenantId, ...data },
    update: data,
  });
}

/**
 * Gera o email institucional de um usuário com base no template configurado.
 * Retorna null se o tenant não tiver emailDomain configurado.
 */
export function formatarEmailInstitucional(
  name: string,
  config: { emailDomain?: string | null; emailTemplate?: string | null },
): string | null {
  if (!config.emailDomain) return null;
  const template = config.emailTemplate ?? "{primeiroNome}.{primeiroSobrenome}";
  const parts = name.trim().toLowerCase().split(/\s+/);
  const primeiroNome = parts[0] ?? "";
  const primeiroSobrenome = parts[1] ?? parts[0] ?? "";
  const nomeCompleto = parts.join(".");
  const local = template
    .replace("{primeiroNome}", primeiroNome)
    .replace("{primeiroSobrenome}", primeiroSobrenome)
    .replace("{nomeCompleto}", nomeCompleto);
  return `${local}@${config.emailDomain}`;
}
