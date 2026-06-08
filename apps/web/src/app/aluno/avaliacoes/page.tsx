import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@nexora/db";
import { Button, EmptyState, Badge } from "@nexora/ui";
import { FileCheck2 } from "lucide-react";

export const metadata: Metadata = { title: "Avaliações" };

export default async function StudentAssessmentsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { activeTenantId: tenantId, id: userId } = session.user;

  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: "ACTIVE" },
    select: { id: true, courseId: true, course: { select: { title: true } } },
  });

  const byCourse = new Map(enrollments.map((e) => [e.courseId, e]));
  const courseIds = enrollments.map((e) => e.courseId);

  const assessments = courseIds.length
    ? await prisma.assessment.findMany({
        where: { tenantId, courseId: { in: courseIds }, status: "PUBLISHED" },
        include: { _count: { select: { questions: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const enrollmentIds = enrollments.map((e) => e.id);
  const submissions = assessments.length
    ? await prisma.submission.findMany({
        where: { enrollmentId: { in: enrollmentIds }, assessmentId: { in: assessments.map((a) => a.id) } },
      })
    : [];

  const rows = assessments.map((a) => {
    const subs = submissions.filter((s) => s.assessmentId === a.id);
    const graded = subs.filter((s) => s.status === "GRADED" && s.score != null);
    const best = graded.length ? Math.max(...graded.map((s) => s.score!)) : null;
    const pending = subs.some((s) => s.status === "SUBMITTED");
    return {
      id: a.id,
      title: a.title,
      courseTitle: byCourse.get(a.courseId)?.course.title ?? "",
      attempts: subs.length,
      maxAttempts: a.maxAttempts,
      passingScore: a.passingScore,
      best,
      pending,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Avaliações</h1>
        <p className="text-sm text-navy-500">Provas e questionários dos seus cursos.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileCheck2 className="h-6 w-6" />}
          title="Nenhuma avaliação disponível"
          description="Quando seus cursos publicarem avaliações, elas aparecerão aqui."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const canTake = r.attempts < r.maxAttempts;
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border border-navy-100 bg-white p-4">
                <FileCheck2 className="h-5 w-5 shrink-0 text-navy-400" />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-navy-900">{r.title}</p>
                  <p className="text-xs text-navy-400">{r.courseTitle} · tentativas {r.attempts}/{r.maxAttempts}</p>
                </div>
                {r.best != null ? (
                  <Badge variant={r.best >= r.passingScore ? "default" : "secondary"} className="shrink-0">
                    Nota {Number(r.best.toFixed(2))}
                  </Badge>
                ) : r.pending ? (
                  <Badge variant="secondary" className="shrink-0">Em correção</Badge>
                ) : null}
                <Button size="sm" disabled={!canTake} asChild={canTake}>
                  {canTake ? <Link href={`/aluno/avaliacoes/${r.id}` as never}>Responder</Link> : <span>Sem tentativas</span>}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
