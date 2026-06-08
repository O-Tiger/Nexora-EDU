import { prisma } from "../client";
import type { EnrollmentStatus } from "@prisma/client";

export async function getEnrollmentsByTenant(
  tenantId: string,
  filters?: { status?: EnrollmentStatus; courseId?: string },
) {
  return prisma.enrollment.findMany({
    where: { tenantId, ...filters },
    include: {
      course: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function enrollUser(data: {
  userId: string;
  courseId: string;
  tenantId: string;
  expiresAt?: Date;
}) {
  return prisma.enrollment.upsert({
    where: { userId_courseId: { userId: data.userId, courseId: data.courseId } },
    update: { status: "ACTIVE", expiresAt: data.expiresAt ?? null, updatedAt: new Date() },
    create: { ...data, status: "ACTIVE" },
  });
}

export async function expireEnrollment(id: string) {
  return prisma.enrollment.update({ where: { id }, data: { status: "EXPIRED", updatedAt: new Date() } });
}

export async function reactivateEnrollment(id: string, newExpiresAt?: Date) {
  return prisma.enrollment.update({
    where: { id },
    data: { status: "ACTIVE", expiresAt: newExpiresAt ?? null, updatedAt: new Date() },
  });
}

// Busca matrículas que já expiraram e ainda estão ACTIVE (para o cron processar)
export async function getOverdueEnrollments() {
  return prisma.enrollment.findMany({
    where: { status: "ACTIVE", expiresAt: { lte: new Date() } },
    include: { course: { select: { title: true } } },
  });
}

// Busca matrículas que expiram nos próximos N dias (para aviso antecipado)
export async function getExpiringEnrollmentsInDays(days: number) {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + days);

  return prisma.enrollment.findMany({
    where: { status: "ACTIVE", expiresAt: { gte: from, lte: to } },
    include: { course: { select: { title: true } } },
  });
}
