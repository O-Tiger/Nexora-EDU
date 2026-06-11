import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@nexora/ui";
import { prisma } from "@nexora/db";
import { getDisciplinas, getTurmaDisciplinas } from "@nexora/db/src/queries/pedagogico";
import { NotasGrid } from "@/components/secretaria/notas-grid";

export const metadata: Metadata = { title: "Lançar notas" };

export default async function NotasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: turmaId } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  const tenantId = session.user.activeTenantId;

  const turma = await prisma.turma.findFirst({
    where: { id: turmaId, tenantId },
    include: {
      enrollments: {
        where: { status: "ATIVA" },
        include: { student: { select: { name: true } } },
        orderBy: { student: { name: "asc" } },
      },
    },
  });
  if (!turma) notFound();

  const [allDisciplinas, assigned] = await Promise.all([
    getDisciplinas(tenantId),
    getTurmaDisciplinas(tenantId, turmaId),
  ]);

  const enrollmentIds = turma.enrollments.map((e) => e.id);
  const [grades, attendances] = await Promise.all([
    prisma.grade.findMany({ where: { tenantId, enrollmentId: { in: enrollmentIds } } }),
    prisma.attendance.findMany({ where: { tenantId, enrollmentId: { in: enrollmentIds } } }),
  ]);

  // Flatten assigned (root + frentes) into selectable gradeable disciplinas
  const assignedFlat = assigned.map((d) => ({ id: d.id, name: d.name, parentId: d.parentId }));

  // Flat list of all disciplinas (root + frentes) for the assignment multi-select
  const allFlat = allDisciplinas.flatMap((d) => [
    { id: d.id, name: d.name, isFrente: false },
    ...d.frentes.map((f) => ({ id: f.id, name: `${d.name} › ${f.name}`, isFrente: true })),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/secretaria/turmas/${turmaId}` as never}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold font-mono text-navy-900">{turma.code}</h1>
          <p className="text-xs text-navy-400">Lançamento de notas e frequência</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/secretaria/boletins?turmaId=${turmaId}` as never} className="gap-2">
            <FileText className="h-4 w-4" /> Gerar boletim
          </Link>
        </Button>
      </div>

      <NotasGrid
        turmaId={turmaId}
        students={turma.enrollments.map((e) => ({ enrollmentId: e.id, name: e.student.name }))}
        allDisciplinas={allFlat}
        assignedIds={assignedFlat.map((d) => d.id)}
        assignedDisciplinas={assignedFlat.map((d) => ({ id: d.id, name: d.name }))}
        grades={grades.map((g) => ({ enrollmentId: g.enrollmentId, disciplinaId: g.disciplinaId, period: g.period, kind: g.kind, score: g.score }))}
        attendances={attendances.map((a) => ({ enrollmentId: a.enrollmentId, disciplinaId: a.disciplinaId, absences: a.absences }))}
      />
    </div>
  );
}
