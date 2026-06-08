import { prisma } from "../client";
import type { EnrollmentStatus } from "@prisma/client";

export async function getEnrollment(userId: string, courseId: string) {
  return prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
}

export async function getActiveEnrollments(tenantId: string) {
  return prisma.enrollment.findMany({
    where: { tenantId, status: "ACTIVE" },
    include: { course: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getExpiringEnrollments(daysAhead: number) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + daysAhead);

  return prisma.enrollment.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lte: threshold, gte: new Date() },
    },
    include: { course: true },
  });
}

export async function updateEnrollmentStatus(
  id: string,
  status: EnrollmentStatus,
) {
  return prisma.enrollment.update({ where: { id }, data: { status } });
}
