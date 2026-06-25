import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@nexora/ui";
import { prisma } from "@nexora/db";
import { getProfessorByUserId } from "@nexora/db/src/queries/professores";
import { getTenantConfig } from "@nexora/db/src/queries/administracao";
import { NotasGrid } from "@/components/secretaria/notas-grid";

export const metadata: Metadata = { title: "Lançar notas" };

export default async function ProfNotasPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id: userId, activeTenantId: tenantId } = session.user;
  const { id: turmaId } = await params;

  const professor = await getProfessorByUserId(userId, tenantId);
  if (!professor) redirect("/unauthorized");

  const [turma, myVinculos, tenantConfig] = await Promise.all([
    prisma.turma.findFirst({
      where: { id: turmaId, tenantId },
      include: {
        enrollments: {
          where: { status: "ATIVA" },
          include: { student: { select: { name: true } } },
          orderBy: { student: { name: "asc" } },
        },
      },
    }),
    prisma.turmaDisciplina.findMany({
      where: { tenantId, turmaId, professorId: professor.id },
      include: { disciplina: { select: { id: true, name: true, parentId: true } } },
    }),
    getTenantConfig(tenantId),
  ]);
  const periodos = tenantConfig?.periodos ?? 3;

  if (!turma) notFound();
  if (myVinculos.length === 0) redirect(`/prof/turmas/${turmaId}`);

  const myDisciplinas = myVinculos.map((v) => ({ id: v.disciplina.id, name: v.disciplina.name }));
  const myIds = myDisciplinas.map((d) => d.id);
  const enrollmentIds = turma.enrollments.map((e) => e.id);

  const [grades, attendances] = await Promise.all([
    prisma.grade.findMany({ where: { tenantId, enrollmentId: { in: enrollmentIds }, disciplinaId: { in: myIds } } }),
    prisma.attendance.findMany({ where: { tenantId, enrollmentId: { in: enrollmentIds }, disciplinaId: { in: myIds } } }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/prof/turmas/${turmaId}` as never}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold font-mono text-navy-900">{turma.code}</h1>
          <p className="text-xs text-navy-400">Lançamento de notas e frequência</p>
        </div>
      </div>

      <NotasGrid
        turmaId={turmaId}
        students={turma.enrollments.map((e) => ({ enrollmentId: e.id, name: e.student.name }))}
        allDisciplinas={[]}
        assignedIds={myIds}
        assignedDisciplinas={myDisciplinas}
        grades={grades.map((g) => ({ enrollmentId: g.enrollmentId, disciplinaId: g.disciplinaId, period: g.period, kind: g.kind, score: g.score }))}
        attendances={attendances.map((a) => ({ enrollmentId: a.enrollmentId, disciplinaId: a.disciplinaId, absences: a.absences }))}
        canManageDisciplinas={false}
        periodos={periodos}
      />
    </div>
  );
}
