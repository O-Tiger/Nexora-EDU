import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { Button } from "@nexora/ui";
import { prisma } from "@nexora/db";
import { getTurmaDisciplinas } from "@nexora/db/src/queries/pedagogico";
import { getHorario, getEventos } from "@nexora/db/src/queries/horario";
import { HorarioGrid } from "@/components/secretaria/horario-grid";
import { EventosManager } from "@/components/secretaria/eventos-manager";

export const metadata: Metadata = { title: "Horário & Eventos" };

export default async function HorarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: turmaId } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  const tenantId = session.user.activeTenantId;

  const turma = await prisma.turma.findFirst({ where: { id: turmaId, tenantId }, select: { id: true, code: true } });
  if (!turma) notFound();

  const [disciplinas, horario, eventos] = await Promise.all([
    getTurmaDisciplinas(tenantId, turmaId),
    getHorario(tenantId, turmaId),
    getEventos(tenantId, turmaId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/secretaria/turmas/${turmaId}` as never}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold font-mono text-navy-900">{turma.code}</h1>
          <p className="text-xs text-navy-400 flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" /> Grade de horários & calendário de eventos
          </p>
        </div>
      </div>

      <HorarioGrid
        turmaId={turmaId}
        disciplinas={disciplinas.map((d) => ({ id: d.id, name: d.name }))}
        initial={horario.map((h) => ({ diaSemana: h.diaSemana, ordem: h.ordem, disciplinaId: h.disciplinaId }))}
      />

      <EventosManager
        turmaId={turmaId}
        eventos={eventos.map((e) => ({
          id: e.id,
          data: e.data.toISOString().slice(0, 10),
          tipo: e.tipo,
          titulo: e.titulo,
          descricao: e.descricao,
        }))}
      />
    </div>
  );
}
