import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@nexora/db";
import { getAssessmentForStudent } from "@nexora/db/src/queries/assessments";
import { countAttempts } from "@nexora/db/src/queries/submissions";
import { AssessmentPlayer } from "@/components/assessments/assessment-player";
import type { QuestionType } from "@nexora/validators";

export const metadata: Metadata = { title: "Avaliação" };

export default async function TakeAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  const { activeTenantId: tenantId, id: userId } = session.user;

  const assessment = await getAssessmentForStudent(tenantId, id);
  if (!assessment) notFound();

  // Matrícula ativa no curso da avaliação (anti-IDOR)
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, courseId: assessment.courseId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!enrollment) redirect("/aluno/cursos");

  const attemptsUsed = await countAttempts(enrollment.id, id);
  const hasEssay = assessment.questions.some((q) => q.type === "ESSAY");

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <AssessmentPlayer
        assessmentId={assessment.id}
        title={assessment.title}
        description={assessment.description}
        questions={assessment.questions.map((q) => ({
          id: q.id,
          type: q.type as QuestionType,
          prompt: q.prompt,
          points: q.points,
          options: q.options,
        }))}
        attemptsUsed={attemptsUsed}
        maxAttempts={assessment.maxAttempts}
        allowFiles={hasEssay}
      />
    </div>
  );
}
