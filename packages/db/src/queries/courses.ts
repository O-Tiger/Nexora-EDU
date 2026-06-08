import { prisma } from "../client";
import type { CourseStatus } from "@prisma/client";

export async function getCourses(tenantId: string, status?: CourseStatus) {
  return prisma.course.findMany({
    where: { tenantId, ...(status ? { status } : {}) },
    include: { _count: { select: { modules: true, enrollments: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getCourseBySlug(tenantId: string, slug: string) {
  return prisma.course.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
    include: {
      modules: {
        orderBy: { position: "asc" },
        include: { lessons: { orderBy: { position: "asc" } } },
      },
    },
  });
}

export async function getCourseById(tenantId: string, id: string) {
  return prisma.course.findFirst({
    where: { id, tenantId },
    include: {
      modules: {
        orderBy: { position: "asc" },
        include: { lessons: { orderBy: { position: "asc" } } },
      },
    },
  });
}

export async function createCourse(
  tenantId: string,
  data: { title: string; slug: string; description?: string; hoursTotal?: number; isOfficial?: boolean },
) {
  return prisma.course.create({ data: { tenantId, ...data } });
}

export async function updateCourse(
  tenantId: string,
  id: string,
  data: Partial<{ title: string; slug: string; description: string; hoursTotal: number; status: CourseStatus; isOfficial: boolean }>,
) {
  return prisma.course.update({ where: { id, tenantId }, data });
}

export async function deleteCourse(tenantId: string, id: string) {
  return prisma.course.delete({ where: { id, tenantId } });
}

/**
 * Exclusão em cascata de um curso de TESTE: remove certificados (que não têm FK)
 * e depois o curso — cujo delete cascateia matrículas (→ progresso), módulos
 * (→ aulas) e avaliações (→ questões/submissões). Tudo numa transação.
 */
export async function deleteCourseCascade(tenantId: string, id: string) {
  return prisma.$transaction([
    prisma.certificate.deleteMany({ where: { tenantId, courseId: id } }),
    prisma.course.delete({ where: { id, tenantId } }),
  ]);
}

/** userIds dos alunos com matrícula ativa no curso — para avisos de descontinuação. */
export async function getEnrolledUserIds(tenantId: string, courseId: string): Promise<string[]> {
  const rows = await prisma.enrollment.findMany({
    where: { tenantId, courseId, status: "ACTIVE" },
    select: { userId: true },
  });
  return [...new Set(rows.map((r) => r.userId))];
}

export async function reorderModules(
  tenantId: string,
  courseId: string,
  orderedIds: string[],
) {
  // Verificar ownership antes de alterar
  const course = await prisma.course.findFirst({ where: { id: courseId, tenantId } });
  if (!course) throw new Error("Curso não encontrado ou sem permissão");

  await prisma.$transaction(
    orderedIds.map((id, position) =>
      prisma.module.update({ where: { id }, data: { position: position + 1 } }),
    ),
  );
}

export async function reorderLessons(
  tenantId: string,
  moduleId: string,
  orderedIds: string[],
) {
  const mod = await prisma.module.findFirst({
    where: { id: moduleId, course: { tenantId } },
  });
  if (!mod) throw new Error("Módulo não encontrado ou sem permissão");

  await prisma.$transaction(
    orderedIds.map((id, position) =>
      prisma.lesson.update({ where: { id }, data: { position: position + 1 } }),
    ),
  );
}
