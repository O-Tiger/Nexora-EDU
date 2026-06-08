import { prisma } from "../client";
import type { Role } from "@prisma/client";

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: { memberships: { where: { active: true } } },
  });
}

export async function getUserMemberships(userId: string) {
  return prisma.tenantMembership.findMany({
    where: { userId, active: true },
    orderBy: { tenantId: "asc" },
  });
}

export async function getUserWithMembership(userId: string, tenantId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        where: { tenantId, active: true },
      },
    },
  });
}

export async function hasRole(userId: string, tenantId: string, role: Role) {
  const membership = await prisma.tenantMembership.findUnique({
    where: { userId_tenantId_role: { userId, tenantId, role } },
  });
  return membership?.active ?? false;
}
