import { prisma } from "../client";

export async function createModule(
  tenantId: string,
  courseId: string,
  data: { title: string; prerequisiteId?: string },
) {
  const course = await prisma.course.findFirst({ where: { id: courseId, tenantId } });
  if (!course) throw new Error("Curso não encontrado ou sem permissão");

  const maxPos = await prisma.module.aggregate({
    where: { courseId },
    _max: { position: true },
  });

  return prisma.module.create({
    data: { courseId, title: data.title, position: (maxPos._max.position ?? 0) + 1, prerequisiteId: data.prerequisiteId ?? null },
  });
}

export async function updateModule(
  tenantId: string,
  id: string,
  data: Partial<{ title: string; prerequisiteId: string | null }>,
) {
  const mod = await prisma.module.findFirst({ where: { id, course: { tenantId } } });
  if (!mod) throw new Error("Módulo não encontrado ou sem permissão");
  return prisma.module.update({ where: { id }, data });
}

export async function deleteModule(tenantId: string, id: string) {
  const mod = await prisma.module.findFirst({ where: { id, course: { tenantId } } });
  if (!mod) throw new Error("Módulo não encontrado ou sem permissão");
  return prisma.module.delete({ where: { id } });
}

export async function createLesson(
  tenantId: string,
  moduleId: string,
  data: {
    title: string;
    type: "VIDEO" | "PDF" | "TEXT" | "LINK" | "LIVE";
    videoRef?: string;
    fileKey?: string;
    content?: string;
    url?: string;
    duration?: number;
  },
) {
  const mod = await prisma.module.findFirst({ where: { id: moduleId, course: { tenantId } } });
  if (!mod) throw new Error("Módulo não encontrado ou sem permissão");

  const maxPos = await prisma.lesson.aggregate({
    where: { moduleId },
    _max: { position: true },
  });

  return prisma.lesson.create({
    data: { moduleId, position: (maxPos._max.position ?? 0) + 1, ...data },
  });
}

export async function updateLesson(
  tenantId: string,
  id: string,
  data: Partial<{
    title: string;
    videoRef: string;
    fileKey: string;
    content: string;
    url: string;
    duration: number;
  }>,
) {
  const lesson = await prisma.lesson.findFirst({ where: { id, module: { course: { tenantId } } } });
  if (!lesson) throw new Error("Aula não encontrada ou sem permissão");
  return prisma.lesson.update({ where: { id }, data });
}

export async function deleteLesson(tenantId: string, id: string) {
  const lesson = await prisma.lesson.findFirst({ where: { id, module: { course: { tenantId } } } });
  if (!lesson) throw new Error("Aula não encontrada ou sem permissão");
  return prisma.lesson.delete({ where: { id } });
}
