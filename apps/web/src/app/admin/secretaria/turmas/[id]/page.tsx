import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus, Users } from "lucide-react";
import { Button, Badge } from "@nexora/ui";
import { getTurmaById } from "@nexora/db/src/queries/secretaria";
import { ETAPA_LABELS, type Etapa } from "@nexora/validators";
import { EnrollStudentForm } from "@/components/secretaria/enroll-student-form";
import { TurmaStudentRow } from "@/components/secretaria/turma-student-row";
import { TurmaDeleteButton } from "@/components/secretaria/turma-delete-button";
import { prisma } from "@nexora/db";

export const metadata: Metadata = { title: "Turma" };

const PERIODO_LABELS: Record<string, string> = {
  MANHA: "Manhã", TARDE: "Tarde", NOITE: "Noite", INTEGRAL: "Integral",
};

export default async function TurmaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  const tenantId = session.user.activeTenantId;

  const turma = await getTurmaById(tenantId, id);
  if (!turma) notFound();

  // Students available to enroll (ALUNO role, not yet in this turma's year)
  const enrolled = new Set(turma.enrollments.map((e) => e.student.id));
  const candidates = await prisma.tenantMembership.findMany({
    where: {
      tenantId,
      role: "ALUNO",
      active: true,
      user: { anonymizedAt: null },
      NOT: {
        userId: { in: [...enrolled] },
      },
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
    take: 200,
  });

  const occupancy = turma.enrollments.length;
  const isFull = occupancy >= turma.maxStudents;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/secretaria/unidades/${turma.unidadeId}?anoLetivoId=${turma.anoLetivoId}` as never}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-navy-900">{turma.code}</h1>
            <Badge variant={isFull ? "destructive" : "secondary"}>
              {occupancy}/{turma.maxStudents} alunos
            </Badge>
          </div>
          <p className="text-sm text-navy-500">
            {ETAPA_LABELS[turma.etapa as Etapa]} · {PERIODO_LABELS[turma.periodo]} ·{" "}
            {turma.unidade.name} · {turma.anoLetivo.year}
          </p>
        </div>
        <TurmaDeleteButton
          turmaId={id}
          code={turma.code}
          unidadeId={turma.unidadeId}
          anoLetivoId={turma.anoLetivoId}
          hasStudents={turma.enrollments.length > 0}
        />
      </div>

      {!isFull && (
        <EnrollStudentForm
          turmaId={id}
          anoLetivoId={turma.anoLetivoId}
          candidates={candidates.map((c) => ({ id: c.user.id, name: c.user.name, email: c.user.email }))}
        />
      )}

      {/* Student list */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-navy-600 uppercase tracking-wide flex items-center gap-2">
          <Users className="h-4 w-4" /> Alunos matriculados
        </h2>
        {turma.enrollments.length === 0 ? (
          <p className="text-sm text-navy-400">Nenhum aluno matriculado.</p>
        ) : (
          <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
            {turma.enrollments.map((e) => (
              <TurmaStudentRow
                key={e.id}
                enrollmentId={e.id}
                studentId={e.student.id}
                name={e.student.name}
                email={e.student.email}
                phone={e.student.phone}
                status={e.status}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
