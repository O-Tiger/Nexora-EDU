import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@nexora/ui";
import { getAssessmentById } from "@nexora/db/src/queries/assessments";
import { getSubmissions } from "@nexora/db/src/queries/submissions";
import { AssessmentSettings } from "@/components/admin/assessment-settings";
import { QuestionEditor } from "@/components/assessments/question-editor";
import { SubmissionGrader } from "@/components/admin/submission-grader";
import type { QuestionType } from "@nexora/validators";

export const metadata: Metadata = { title: "Editar avaliação" };

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string; assessmentId: string }>;
}) {
  const { id: courseId, assessmentId } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  const tenantId = session.user.activeTenantId;

  const assessment = await getAssessmentById(tenantId, assessmentId);
  if (!assessment) notFound();

  const submissions = await getSubmissions(tenantId, assessmentId);
  const totalPoints = assessment.questions.reduce((s, q) => s + q.points, 0);

  // Submissões pendentes de correção manual (têm dissertativa)
  const essayQuestions = assessment.questions.filter((q) => q.type === "ESSAY");
  const pending = submissions
    .filter((s) => s.status === "SUBMITTED")
    .map((s) => {
      const answers = (s.answers ?? {}) as Record<string, unknown>;
      return {
        id: s.id,
        attempt: s.attempt,
        autoScore: s.score,
        essayAnswers: essayQuestions.map((q) => ({
          prompt: q.prompt,
          answer: typeof answers[q.id] === "string" ? (answers[q.id] as string) : "",
        })),
      };
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/cursos/${courseId}/avaliacoes` as never}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-navy-900">{assessment.title}</h1>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase text-navy-400">Configurações</h2>
        <AssessmentSettings
          assessmentId={assessmentId}
          courseId={courseId}
          initial={{
            title: assessment.title,
            description: assessment.description ?? "",
            passingScore: assessment.passingScore,
            maxAttempts: assessment.maxAttempts,
            formulaVar: assessment.formulaVar ?? "",
            status: assessment.status,
          }}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase text-navy-400">Questões</h2>
        <QuestionEditor
          assessmentId={assessmentId}
          courseId={courseId}
          initialQuestions={assessment.questions.map((q) => ({
            id: q.id,
            type: q.type as QuestionType,
            prompt: q.prompt,
            points: q.points,
            options: q.options,
            correctAnswer: q.correctAnswer,
          }))}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase text-navy-400">Correção pendente</h2>
        <SubmissionGrader courseId={courseId} totalPoints={totalPoints} submissions={pending} />
      </section>
    </div>
  );
}
