import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import { getCourseBySlug } from "@nexora/db/src/queries/courses";
import { prisma } from "@nexora/db";
import type { Metadata } from "next";
import { CoursePlayer } from "@/components/aluno/course-player";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ") };
}

export default async function CoursePlayerPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ aula?: string }>;
}) {
  const { slug } = await params;
  const { aula: currentLessonId } = await searchParams;

  const session = await auth();
  if (!session) redirect("/login");

  const course = await getCourseBySlug(session.user.activeTenantId, slug);
  if (!course) notFound();

  // Verificar matrícula ativa
  const isStaff = ["ADMIN", "SUPER_ADMIN", "COORDENADOR", "PROFESSOR"].includes(session.user.role);
  let enrollmentId: string | null = null;

  if (!isStaff) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: session.user.id, courseId: course.id, status: "ACTIVE" },
    });
    if (!enrollment) redirect("/aluno?sem-acesso=1");
    enrollmentId = enrollment.id;
  }

  // Progresso do aluno
  const completedLessonIds = enrollmentId
    ? (await prisma.lessonProgress.findMany({
        where: { enrollmentId, completed: true },
        select: { lessonId: true },
      })).map((p) => p.lessonId)
    : [];

  // Aula atual: a passada na query string ou a primeira não concluída
  const allLessons = course.modules.flatMap((m) => m.lessons);
  const activeLesson =
    allLessons.find((l) => l.id === currentLessonId) ??
    allLessons.find((l) => !completedLessonIds.includes(l.id)) ??
    allLessons[0];

  return (
    <CoursePlayer
      course={course}
      activeLesson={activeLesson ?? null}
      completedLessonIds={completedLessonIds}
      enrollmentId={enrollmentId}
    />
  );
}
