import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookText } from "lucide-react";
import { Button } from "@nexora/ui";
import { prisma } from "@nexora/db";
import { getProfessorByUserId } from "@nexora/db/src/queries/professores";
import { getRegistros } from "@nexora/db/src/queries/diario";
import { DiarioManager } from "@/components/secretaria/diario-manager";

export const metadata: Metadata = { title: "Diário de classe" };

export default async function ProfDiarioPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id: userId, activeTenantId: tenantId } = session.user;
  const { id: turmaId } = await params;

  const professor = await getProfessorByUserId(userId, tenantId);
  if (!professor) redirect("/unauthorized");

  const [turma, myVinculos] = await Promise.all([
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
      include: { disciplina: { select: { id: true, name: true } } },
    }),
  ]);

  if (!turma) notFound();
  if (myVinculos.length === 0) redirect(`/prof/turmas/${turmaId}`);

  const myDisciplinas = myVinculos.map((v) => ({ id: v.disciplina.id, name: v.disciplina.name }));
  const myIds = myDisciplinas.map((d) => d.id);

  // Filter registros to only this professor's disciplines
  const registros = await getRegistros(tenantId, turmaId);
  const myRegistros = registros.filter((r) => myIds.includes(r.disciplinaId));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/prof/turmas/${turmaId}` as never}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold font-mono text-navy-900">{turma.code}</h1>
          <p className="text-xs text-navy-400 flex items-center gap-1">
            <BookText className="h-3.5 w-3.5" /> Diário de classe
          </p>
        </div>
      </div>

      <DiarioManager
        turmaId={turmaId}
        students={turma.enrollments.map((e) => ({ enrollmentId: e.id, name: e.student.name }))}
        disciplinas={myDisciplinas}
        registros={myRegistros.map((r) => ({
          id: r.id,
          disciplinaId: r.disciplinaId,
          disciplinaName: r.disciplina.name,
          data: r.data.toISOString().slice(0, 10),
          quantidadeAulas: r.quantidadeAulas,
          conteudo: r.conteudo,
          presencasCount: r._count.presencas,
        }))}
      />
    </div>
  );
}
