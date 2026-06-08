import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@nexora/ui";
import { getCourseById } from "@nexora/db/src/queries/courses";
import { getAssessments, getGradeContext } from "@nexora/db/src/queries/assessments";
import { AssessmentManager } from "@/components/admin/assessment-manager";
import { GradeFormula } from "@/components/assessments/grade-formula";

export const metadata: Metadata = { title: "Avaliações" };

export default async function CourseAssessmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  const tenantId = session.user.activeTenantId;

  const course = await getCourseById(tenantId, id);
  if (!course) notFound();

  const [assessments, gradeCtx] = await Promise.all([
    getAssessments(tenantId, id),
    getGradeContext(tenantId, id),
  ]);

  const items = assessments.map((a) => ({
    id: a.id,
    title: a.title,
    status: a.status,
    questions: a._count.questions,
    submissions: a._count.submissions,
  }));

  const vars = gradeCtx.assessments
    .filter((a): a is typeof a & { formulaVar: string } => Boolean(a.formulaVar))
    .map((a) => ({ formulaVar: a.formulaVar, title: a.title }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/cursos/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Avaliações</h1>
          <p className="text-sm text-navy-500">{course.title}</p>
        </div>
      </div>

      <AssessmentManager courseId={id} initial={items} />

      <GradeFormula courseId={id} initialFormula={gradeCtx.course?.gradeFormula ?? ""} vars={vars} />
    </div>
  );
}
