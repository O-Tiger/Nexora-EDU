"use client";

import { useTransition } from "react";
import { Button, toast } from "@nexora/ui";
import { CheckCircle, AlertCircle, Clock, Ban, Gift } from "lucide-react";
import { MESES_LABELS, MENSALIDADE_STATUS_LABELS } from "@nexora/validators";
import { updateMensalidadeAction } from "@/actions/financeiro";
import type { MensalidadeComAluno } from "@nexora/db/src/queries/financeiro";

type Props = {
  mensalidades: MensalidadeComAluno[];
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PAGA: <CheckCircle className="h-4 w-4 text-teal-600" />,
  VENCIDA: <AlertCircle className="h-4 w-4 text-red-500" />,
  PENDENTE: <Clock className="h-4 w-4 text-amber-500" />,
  CANCELADA: <Ban className="h-4 w-4 text-navy-400" />,
  ISENTA: <Gift className="h-4 w-4 text-indigo-500" />,
};

const STATUS_BADGE: Record<string, string> = {
  PAGA: "bg-teal-50 text-teal-700",
  VENCIDA: "bg-red-50 text-red-700",
  PENDENTE: "bg-amber-50 text-amber-700",
  CANCELADA: "bg-navy-50 text-navy-500",
  ISENTA: "bg-indigo-50 text-indigo-700",
};

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MensalidadeRow({ m }: { m: MensalidadeComAluno }) {
  const [isPending, startTransition] = useTransition();

  function marcarPaga() {
    startTransition(async () => {
      const r = await updateMensalidadeAction(m.id, { status: "PAGA", paidAt: new Date() });
      if ("error" in r) toast({ variant: "destructive", title: "Erro", description: r.error });
      else toast({ title: "Marcada como paga" });
    });
  }

  const valorEfetivo = m.valorCents - m.descontoCents;

  return (
    <tr className="border-b border-navy-50 hover:bg-navy-50/40">
      <td className="px-4 py-3 text-sm text-navy-900">{m.student.name}</td>
      <td className="px-4 py-3 text-sm text-navy-600">{m.plano.nome}</td>
      <td className="px-4 py-3 text-sm text-navy-600">
        {MESES_LABELS[m.mes]}/{m.ano}
      </td>
      <td className="px-4 py-3 text-sm text-navy-900 font-medium">{formatBRL(valorEfetivo)}</td>
      <td className="px-4 py-3 text-sm text-navy-500">
        {new Date(m.vencimento).toLocaleDateString("pt-BR")}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[m.status] ?? ""}`}>
          {STATUS_ICONS[m.status]}
          {MENSALIDADE_STATUS_LABELS[m.status] ?? m.status}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {(m.status === "PENDENTE" || m.status === "VENCIDA") && (
          <Button size="sm" variant="outline" onClick={marcarPaga} disabled={isPending}>
            Dar baixa
          </Button>
        )}
      </td>
    </tr>
  );
}

export function MensalidadesTable({ mensalidades }: Props) {
  if (mensalidades.length === 0) {
    return (
      <div className="rounded-lg border border-navy-100 bg-white px-6 py-12 text-center">
        <Clock className="h-8 w-8 text-navy-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-navy-600">Nenhuma mensalidade encontrada</p>
        <p className="text-xs text-navy-400 mt-1">Crie um plano de cobrança e gere as mensalidades.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-navy-100 bg-white">
      <table className="w-full text-left">
        <thead className="bg-navy-50 border-b border-navy-100">
          <tr>
            {["Aluno", "Plano", "Referência", "Valor", "Vencimento", "Status", ""].map((h) => (
              <th key={h} className="px-4 py-2 text-xs font-semibold text-navy-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mensalidades.map((m) => (
            <MensalidadeRow key={m.id} m={m} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
