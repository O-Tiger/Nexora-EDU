"use server";

import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@nexora/db";
import { markLessonComplete, markLessonIncomplete, getEnrollmentProgress } from "@nexora/db/src/queries/progress";
import { setCachedProgress } from "@/lib/redis";

async function requireEnrollment(lessonId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  // Buscar a aula e verificar se o aluno tem matrícula ativa no curso
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, module: { course: { tenantId: session.user.activeTenantId } } },
    include: {
      module: {
        include: {
          course: {
            include: {
              enrollments: {
                where: { userId: session.user.id, status: "ACTIVE" },
              },
            },
          },
        },
      },
    },
  });

  if (!lesson) throw new Error("Aula não encontrada");

  const isStaff =
    session.user.role === "ADMIN" ||
    session.user.role === "SUPER_ADMIN" ||
    session.user.role === "COORDENADOR" ||
    session.user.role === "PROFESSOR";

  const enrollment = lesson.module.course.enrollments[0];
  if (!isStaff && !enrollment) throw new Error("Sem matrícula ativa neste curso");

  return { enrollment: enrollment ?? null, userId: session.user.id };
}

export async function markLessonCompleteAction(lessonId: string, courseSlug: string) {
  const { enrollment } = await requireEnrollment(lessonId);
  if (!enrollment) return; // staff não tem progresso registrado

  await markLessonComplete(enrollment.id, lessonId);

  // Atualizar cache do progresso
  const percent = await getEnrollmentProgress(enrollment.id);
  await setCachedProgress(enrollment.id, percent);

  revalidatePath(`/aluno/cursos/${courseSlug}`);
}

export async function markLessonIncompleteAction(lessonId: string, courseSlug: string) {
  const { enrollment } = await requireEnrollment(lessonId);
  if (!enrollment) return;

  await markLessonIncomplete(enrollment.id, lessonId);

  const percent = await getEnrollmentProgress(enrollment.id);
  await setCachedProgress(enrollment.id, percent);

  revalidatePath(`/aluno/cursos/${courseSlug}`);
}
