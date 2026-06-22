import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, UserCheck, CalendarDays, DollarSign, ChevronRight } from "lucide-react";
import { getFilhosFromSession } from "@/lib/responsavel";
import { prisma } from "@nexora/db";
import { getMensalidadesByStudent } from "@nexora/db/src/queries/financeiro";

export const metadata: Metadata = { title: "Portal do Responsável" };

const quickLinks = [
  { href: "/responsavel/boletim", label: "Boletim", icon: FileText, desc: "Notas por trimestre" },
  { href: "/responsavel/frequencia", label: "Frequência", icon: UserCheck, desc: "Faltas e presenças" },
  { href: "/responsavel/calendario", label: "Calendário", icon: CalendarDays, desc: "Provas e eventos" },
  { href: "/responsavel/mensalidades", label: "Mensalidades", icon: DollarSign, desc: "Situação financeira" },
];

export default async function ResponsavelDashboard() {
  const session = await auth();
  if (!session) redirect("/login");

  const filhos = await getFilhosFromSession(session.user.id, session.user.activeTenantId);
  const filho = filhos[0];
  if (!filho) redirect("/login");

  // Próximos eventos (3 mais próximos)
  const hoje = new Date();
  const proximosEventos = filho.turmaId
    ? await prisma.eventoCalendario.findMany({
        where: { tenantId: session.user.activeTenantId, turmaId: filho.turmaId, data: { gte: hoje } },
        orderBy: { data: "asc" },
        take: 3,
      })
    : [];

  // Mensalidades pendentes/vencidas
  const mensalidades = filho.anoLetivoId
    ? await getMensalidadesByStudent(session.user.activeTenantId, filho.studentId, filho.anoLetivoId)
    : [];
  const pendencias = mensalidades.filter((m) => m.status === "PENDENTE" || m.status === "VENCIDA");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Olá, {session.user.name.split(" ")[0]}</h1>
        <p className="text-sm text-navy-500 mt-1">
          Acompanhando: <span className="font-medium text-navy-700">{filho.studentName}</span>
          {filho.turmaCode && <> · Turma <span className="font-mono font-medium">{filho.turmaCode}</span></>}
          {filho.anoLetivoYear && <> · {filho.anoLetivoYear}</>}
        </p>
      </div>

      {pendencias.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-red-800">
              {pendencias.length} mensalidade{pendencias.length !== 1 ? "s" : ""} pendente{pendencias.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-red-600 mt-0.5">Acesse a seção de mensalidades para mais detalhes.</p>
          </div>
          <Link href={"/responsavel/mensalidades" as never}>
            <ChevronRight className="h-5 w-5 text-red-500" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickLinks.map(({ href, label, icon: Icon, desc }) => (
          <Link
            key={href}
            href={href as never}
            className="group rounded-lg border border-navy-100 bg-white p-5 flex items-center gap-4 hover:border-teal-300 hover:shadow-sm transition-all"
          >
            <div className="rounded-full bg-teal-50 p-3 group-hover:bg-teal-100 transition-colors">
              <Icon className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="font-semibold text-navy-900">{label}</p>
              <p className="text-xs text-navy-500">{desc}</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-navy-300 group-hover:text-teal-500 transition-colors" />
          </Link>
        ))}
      </div>

      {proximosEventos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-navy-600 uppercase tracking-wide">Próximos eventos</h2>
          <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
            {proximosEventos.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 px-4 py-3">
                <div className="text-center min-w-[40px]">
                  <p className="text-lg font-bold text-navy-900 leading-none">{new Date(ev.data).getDate()}</p>
                  <p className="text-xs text-navy-400">
                    {new Date(ev.data).toLocaleString("pt-BR", { month: "short" })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-navy-900">{ev.titulo}</p>
                  <p className="text-xs text-navy-500">{ev.tipo}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
