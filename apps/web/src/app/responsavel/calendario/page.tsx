import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { getFilhosFromSession } from "@/lib/responsavel";
import { getEventos } from "@nexora/db/src/queries/horario";

export const metadata: Metadata = { title: "Calendário" };

const TIPO_LABELS: Record<string, string> = {
  PROVA: "Prova", SIMULADO: "Simulado", OLIMPIADA: "Olimpíada",
  TRABALHO: "Trabalho", REUNIAO: "Reunião", PASSEIO: "Passeio",
  FERIADO: "Feriado", OUTRO: "Outro",
};

const TIPO_COLORS: Record<string, string> = {
  PROVA: "bg-red-100 text-red-700",
  SIMULADO: "bg-orange-100 text-orange-700",
  OLIMPIADA: "bg-purple-100 text-purple-700",
  TRABALHO: "bg-blue-100 text-blue-700",
  REUNIAO: "bg-yellow-100 text-yellow-700",
  PASSEIO: "bg-green-100 text-green-700",
  FERIADO: "bg-teal-100 text-teal-700",
  OUTRO: "bg-navy-100 text-navy-600",
};

export default async function ResponsavelCalendarioPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const filhos = await getFilhosFromSession(session.user.id, session.user.activeTenantId);
  const filho = filhos[0];
  if (!filho?.turmaId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-navy-900 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-teal-500" /> Calendário</h1>
        <p className="text-sm text-navy-500">Aluno sem turma ativa.</p>
      </div>
    );
  }

  const eventos = await getEventos(session.user.activeTenantId, filho.turmaId);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const futuros = eventos.filter((e) => new Date(e.data) >= hoje);
  const passados = eventos.filter((e) => new Date(e.data) < hoje).reverse();

  function EventCard({ e }: { e: typeof eventos[number] }) {
    const d = new Date(e.data);
    return (
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="text-center min-w-[44px]">
          <p className="text-lg font-bold text-navy-900 leading-none">{d.getDate()}</p>
          <p className="text-xs text-navy-400">{d.toLocaleString("pt-BR", { month: "short" })}</p>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-navy-900">{e.titulo}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COLORS[e.tipo] ?? "bg-navy-100 text-navy-600"}`}>
              {TIPO_LABELS[e.tipo] ?? e.tipo}
            </span>
          </div>
          {e.descricao && <p className="text-xs text-navy-500 mt-0.5">{e.descricao}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy-900 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-teal-500" /> Calendário
        </h1>
        <p className="text-sm text-navy-500">Turma {filho.turmaCode} · {filho.anoLetivoYear}</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-navy-600 uppercase tracking-wide">Próximos eventos</h2>
        <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
          {futuros.map((e) => <EventCard key={e.id} e={e} />)}
          {futuros.length === 0 && <p className="px-4 py-6 text-sm text-navy-400 text-center">Nenhum evento futuro registrado.</p>}
        </div>
      </section>

      {passados.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-navy-600 uppercase tracking-wide">Eventos anteriores</h2>
          <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50 opacity-60">
            {passados.slice(0, 5).map((e) => <EventCard key={e.id} e={e} />)}
          </div>
        </section>
      )}
    </div>
  );
}
