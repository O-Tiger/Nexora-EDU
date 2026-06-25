import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { DollarSign, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { getFilhosFromSession, pickFilho } from "@/lib/responsavel";
import { getMensalidadesByStudent } from "@nexora/db/src/queries/financeiro";
import { MESES_LABELS, MENSALIDADE_STATUS_LABELS, MENSALIDADE_TIPO_LABELS } from "@nexora/validators";

export const metadata: Metadata = { title: "Mensalidades" };

const STATUS_ICON: Record<string, React.ReactNode> = {
  PAGA:     <CheckCircle className="h-4 w-4 text-teal-600" />,
  VENCIDA:  <AlertCircle className="h-4 w-4 text-red-500" />,
  PENDENTE: <Clock className="h-4 w-4 text-amber-500" />,
};

const STATUS_BADGE: Record<string, string> = {
  PAGA:     "bg-teal-50 text-teal-700",
  VENCIDA:  "bg-red-50 text-red-700",
  PENDENTE: "bg-amber-50 text-amber-700",
  CANCELADA: "bg-navy-50 text-navy-400",
  ISENTA:   "bg-indigo-50 text-indigo-700",
};

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ResponsavelMensalidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const [filhos, sp] = await Promise.all([
    getFilhosFromSession(session.user.id, session.user.activeTenantId),
    searchParams,
  ]);
  const filho = pickFilho(filhos, sp.studentId);
  if (!filho) redirect("/responsavel" as never);

  const mensalidades = await getMensalidadesByStudent(
    session.user.activeTenantId,
    filho.studentId,
    filho.anoLetivoId ?? undefined,
  );

  const pendentes = mensalidades.filter((m) => m.status === "PENDENTE" || m.status === "VENCIDA");
  const totalPendenteCents = pendentes.reduce((s, m) => s + m.valorCents - m.descontoCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy-900 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-teal-500" /> Mensalidades
        </h1>
        <p className="text-sm text-navy-500">{filho.studentName} · {filho.anoLetivoYear}</p>
      </div>

      {pendentes.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-800">
            {pendentes.length} parcela{pendentes.length !== 1 ? "s" : ""} em aberto — {formatBRL(totalPendenteCents)}
          </p>
          <p className="text-xs text-red-600 mt-0.5">
            Entre em contato com a secretaria para regularizar sua situação.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
        {mensalidades.map((m) => {
          const valorEfetivo = m.valorCents - m.descontoCents;
          return (
            <div key={m.id} className="flex items-center justify-between px-4 py-3 flex-wrap gap-2">
              <div>
                <p className="text-sm font-medium text-navy-900">
                  {MESES_LABELS[m.mes]}/{m.ano}
                </p>
                <p className="text-xs text-navy-500">
                  {m.plano.nome}
                  {m.tipo === "TAXA_RESERVA" && <> · {MENSALIDADE_TIPO_LABELS[m.tipo]}</>}
                  {" "}· Vence {new Date(m.vencimento).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-navy-900">{formatBRL(valorEfetivo)}</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[m.status] ?? ""}`}>
                  {STATUS_ICON[m.status]}
                  {MENSALIDADE_STATUS_LABELS[m.status] ?? m.status}
                </span>
              </div>
            </div>
          );
        })}
        {mensalidades.length === 0 && (
          <p className="px-4 py-6 text-sm text-navy-400 text-center">Nenhuma mensalidade registrada para este ano.</p>
        )}
      </div>
    </div>
  );
}
