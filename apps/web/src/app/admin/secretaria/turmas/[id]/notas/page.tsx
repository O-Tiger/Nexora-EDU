import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@nexora/ui";
import { prisma } from "@nexora/db";
import { getDisciplinas, getTurmaDisciplinas, getEnrollmentFrentes } from "@nexora/db/src/queries/pedagogico";
import { getTenantConfig } from "@nexora/db/src/queries/administracao";
import { NotasGrid } from "@/components/secretaria/notas-grid";
import { ItinerarioPanel } from "@/components/secretaria/itinerario-panel";

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

  const [allDisciplinas, assigned, tenantConfig] = await Promise.all([
    getDisciplinas(tenantId),
    getTurmaDisciplinas(tenantId, turmaId),
    getTenantConfig(tenantId),
  ]);
  const periodos = tenantConfig?.periodos ?? 3;

  const enrollmentIds = turma.enrollments.map((e) => e.id);
  const [grades, attendances] = await Promise.all([
    prisma.grade.findMany({ where: { tenantId, enrollmentId: { in: enrollmentIds } } }),
    prisma.attendance.findMany({ where: { tenantId, enrollmentId: { in: enrollmentIds } } }),
  ]);

  // assignedIds for quick lookup
  const assignedIdSet = new Set(assigned.map((d) => d.id));

  // Itinerário parents that have at least one frente assigned to this turma
  const itinerarioParents = allDisciplinas.filter(
    (d) => d.isItinerario && d.frentes.some((f) => assignedIdSet.has(f.id)),
  );

  // frenteId → parentId (only for itinerário parents)
  const itinerarioFrenteOf: Record<string, string> = {};
  for (const p of itinerarioParents) {
    for (const f of p.frentes) itinerarioFrenteOf[f.id] = p.id;
  }

  // Fetch enrollment frentes for all itinerário parents in this turma
  const enrollmentFrentesRows = itinerarioParents.length > 0
    ? (await Promise.all(itinerarioParents.map((p) => getEnrollmentFrentes(tenantId, turmaId, p.id)))).flat()
    : [];

  // Flat list of all disciplinas for the assignment multi-select
  const allFlat = allDisciplinas.flatMap((d) => [
    { id: d.id, name: d.name, isFrente: false },
    ...d.frentes.map((f) => ({ id: f.id, name: `${d.name} › ${f.name}`, isFrente: true })),
  ]);

  const assignedFlat = assigned.map((d) => ({ id: d.id, name: d.name, parentId: d.parentId }));

  const students = turma.enrollments.map((e) => ({ enrollmentId: e.id, name: e.student.name }));

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

      {itinerarioParents.length > 0 && (
        <ItinerarioPanel
          students={students}
          itinerarioParents={itinerarioParents.map((p) => ({
            id: p.id,
            name: p.name,
            frentes: p.frentes.filter((f) => assignedIdSet.has(f.id)).map((f) => ({ id: f.id, name: f.name })),
          }))}
          enrollmentFrentes={enrollmentFrentesRows}
        />
      )}

      <NotasGrid
        turmaId={turmaId}
        students={students}
        allDisciplinas={allFlat}
        assignedIds={assignedFlat.map((d) => d.id)}
        assignedDisciplinas={assignedFlat.map((d) => ({ id: d.id, name: d.name }))}
        grades={grades.map((g) => ({ enrollmentId: g.enrollmentId, disciplinaId: g.disciplinaId, period: g.period, kind: g.kind, score: g.score }))}
        attendances={attendances.map((a) => ({ enrollmentId: a.enrollmentId, disciplinaId: a.disciplinaId, absences: a.absences }))}
        periodos={periodos}
        itinerarioFrenteOf={itinerarioFrenteOf}
        enrollmentFrentes={enrollmentFrentesRows}
      />
    </div>
  );
}
