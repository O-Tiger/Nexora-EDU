import { prisma } from "../client";

export async function getEnrollmentProgress(enrollmentId: string) {
  const [total, completed] = await Promise.all([
    prisma.lessonProgress.count({ where: { enrollmentId } }),
    prisma.lessonProgress.count({ where: { enrollmentId, completed: true } }),
  ]);
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export async function getLessonProgress(enrollmentId: string, lessonId: string) {
  return prisma.lessonProgress.findUnique({
    where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
  });
}

export async function markLessonComplete(
  enrollmentId: string,
  lessonId: string,
): Promise<void> {
  await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    update: { completed: true, completedAt: new Date() },
    create: { enrollmentId, lessonId, completed: true, completedAt: new Date() },
  });
}

export async function markLessonIncomplete(
  enrollmentId: string,
  lessonId: string,
): Promise<void> {
  await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    update: { completed: false, completedAt: null },
    create: { enrollmentId, lessonId, completed: false },
  });
}

export async function getStudentEnrollmentsWithProgress(userId: string, tenantId: string) {
  return prisma.enrollment.findMany({
    where: { userId, tenantId, status: "ACTIVE" },
    include: {
      course: {
        include: {
          modules: {
            include: { lessons: { select: { id: true } } },
          },
        },
      },
      progress: { where: { completed: true }, select: { lessonId: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
