import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@nexora/ui";
import { prisma } from "@nexora/db";
import { getProfessorByUserId } from "@nexora/db/src/queries/professores";
import { getAvaliacoesConfig } from "@nexora/db/src/queries/avaliacoes";
import { NotasGrid } from "@/components/secretaria/notas-grid";

export const metadata: Metadata = { title: "Lançar notas" };

export default async function ProfNotasPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id: userId, activeTenantId: tenantId } = session.user;
  const { id: turmaId } = await params;

  const professor = await getProfessorByUserId(userId, tenantId);
  if (!professor) redirect("/unauthorized");

  const [turma, myVinculos, avaliacoesConfig] = await Promise.all([
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
    getAvaliacoesConfig(tenantId),
  ]);

  if (!turma) notFound();
  if (myVinculos.length === 0) redirect(`/prof/turmas/${turmaId}`);

  // Prof: frentes already individually assigned — group them by parentId
  const frentesByParent = new Map<string, { id: string; name: string }[]>();
  const standaloneDiscs: { id: string; name: string }[] = [];
  for (const v of myVinculos) {
    const d = v.disciplina;
    if (d.parentId) {
      const arr = frentesByParent.get(d.parentId) ?? [];
      arr.push({ id: d.id, name: d.name });
      frentesByParent.set(d.parentId, arr);
    } else {
      standaloneDiscs.push({ id: d.id, name: d.name });
    }
  }
  const discWithFrentes = [
    ...[...frentesByParent.entries()].map(([parentId, frentes]) => ({
      id: parentId,
      name: frentes[0]?.name.replace(/ \d+$/, "") ?? parentId,
      frentes: frentes.sort((a, b) => a.name.localeCompare(b.name)),
    })),
    ...standaloneDiscs.map((d) => ({ ...d, frentes: [] as { id: string; name: string }[] })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const myIds = myVinculos.map((v) => v.disciplina.id);
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
        discWithFrentes={discWithFrentes}
        grades={grades.map((g) => ({ enrollmentId: g.enrollmentId, disciplinaId: g.disciplinaId, avaliacaoConfigId: g.avaliacaoConfigId, score: g.score }))}
        attendances={attendances.map((a) => ({ enrollmentId: a.enrollmentId, disciplinaId: a.disciplinaId, absences: a.absences }))}
        avaliacoesConfig={avaliacoesConfig}
        canManageDisciplinas={false}
      />
    </div>
  );
}
