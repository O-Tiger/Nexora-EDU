import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookText } from "lucide-react";
import { Button } from "@nexora/ui";
import { prisma } from "@nexora/db";
import { getTurmaDisciplinas } from "@nexora/db/src/queries/pedagogico";
import { getRegistros } from "@nexora/db/src/queries/diario";
import { getHorarioSlotsForDiario } from "@nexora/db/src/queries/horario";
import { DiarioManager } from "@/components/secretaria/diario-manager";

export const metadata: Metadata = { title: "Diário de classe" };

export default async function DiarioPage({ params }: { params: Promise<{ id: string }> }) {
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

  const [disciplinas, registros, horarioSlots] = await Promise.all([
    getTurmaDisciplinas(tenantId, turmaId),
    getRegistros(tenantId, turmaId),
    getHorarioSlotsForDiario(tenantId, turmaId),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/secretaria/turmas/${turmaId}` as never}><ArrowLeft className="h-4 w-4" /></Link>
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
        disciplinas={disciplinas.map((d) => ({ id: d.id, name: d.name }))}
        registros={registros.map((r) => ({
          id: r.id,
          disciplinaId: r.disciplinaId,
          disciplinaName: r.disciplina.name,
          data: r.data.toISOString().slice(0, 10),
          quantidadeAulas: r.quantidadeAulas,
          conteudo: r.conteudo,
          presencasCount: r._count.presencas,
        }))}
        horarioSlots={horarioSlots}
      />
    </div>
  );
}
