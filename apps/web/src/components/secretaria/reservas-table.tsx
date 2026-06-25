"use client";

import { useState, useTransition } from "react";
import { Button, Input, toast } from "@nexora/ui";
import { CheckCircle, Clock, Ban, XCircle, BookmarkCheck } from "lucide-react";
import { RESERVA_STATUS_LABELS } from "@nexora/validators";
import { confirmarReservaAction, cancelarReservaAction } from "@/actions/reservas";
import type { ReservaComDetalhes } from "@nexora/db/src/queries/reservas";

type Props = { reservas: ReservaComDetalhes[] };

const STATUS_BADGE: Record<string, string> = {
  PENDENTE:   "bg-amber-50 text-amber-700",
  PAGA:       "bg-teal-50 text-teal-700",
  CONFIRMADA: "bg-indigo-50 text-indigo-700",
  CANCELADA:  "bg-navy-50 text-navy-400",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDENTE:   <Clock className="h-4 w-4 text-amber-500" />,
  PAGA:       <CheckCircle className="h-4 w-4 text-teal-600" />,
  CONFIRMADA: <BookmarkCheck className="h-4 w-4 text-indigo-600" />,
  CANCELADA:  <XCircle className="h-4 w-4 text-navy-400" />,
};

function ReservaRow({ r }: { r: ReservaComDetalhes }) {
  const [isPending, startTransition] = useTransition();
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  function confirmar() {
    startTransition(async () => {
      const res = await confirmarReservaAction(r.id);
      if ("error" in res) toast({ variant: "destructive", title: "Erro", description: res.error });
      else toast({ title: "Matrícula confirmada", description: `${r.student.name} → ${r.turmaProxima.code}` });
    });
  }

  function cancelar() {
    if (cancelReason.trim().length < 5) {
      toast({ variant: "destructive", title: "Informe o motivo (mín. 5 caracteres)" });
      return;
    }
    startTransition(async () => {
      const res = await cancelarReservaAction(r.id, { cancelReason });
      if ("error" in res) toast({ variant: "destructive", title: "Erro", description: res.error });
      else { toast({ title: "Reserva cancelada" }); setCancelMode(false); }
    });
  }

  return (
    <tr className="border-b border-navy-50 hover:bg-navy-50/40 align-top">
      <td className="px-4 py-3 text-sm text-navy-900">{r.student.name}</td>
      <td className="px-4 py-3 text-sm text-navy-600">{r.turmaAtual.code}</td>
      <td className="px-4 py-3 text-sm font-medium text-navy-900">{r.turmaProxima.code}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] ?? ""}`}>
          {STATUS_ICONS[r.status]}
          {RESERVA_STATUS_LABELS[r.status] ?? r.status}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {cancelMode ? (
          <div className="flex flex-col gap-1 items-end min-w-[200px]">
            <Input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Motivo do cancelamento"
              className="text-xs"
              maxLength={500}
            />
            <div className="flex gap-1">
              <Button size="sm" variant="destructive" onClick={cancelar} disabled={isPending}>Confirmar</Button>
              <Button size="sm" variant="ghost" onClick={() => setCancelMode(false)}>Voltar</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-1 justify-end">
            {r.status === "PAGA" && (
              <Button size="sm" variant="outline" onClick={confirmar} disabled={isPending}>
                Confirmar matrícula
              </Button>
            )}
            {(r.status === "PENDENTE" || r.status === "PAGA") && (
              <Button size="sm" variant="ghost" onClick={() => setCancelMode(true)} disabled={isPending}>
                <Ban className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

export function ReservasTable({ reservas }: Props) {
  if (reservas.length === 0) {
    return (
      <div className="rounded-lg border border-navy-100 bg-white px-6 py-12 text-center">
        <BookmarkCheck className="h-8 w-8 text-navy-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-navy-600">Nenhuma reserva cadastrada</p>
        <p className="text-xs text-navy-400 mt-1">Use o formulário abaixo para reservar vagas de alunos-destaque.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-navy-100 bg-white">
      <table className="w-full text-left">
        <thead className="bg-navy-50 border-b border-navy-100">
          <tr>
            {["Aluno", "Turma Atual", "Turma Reservada", "Status", ""].map((h) => (
              <th key={h} className="px-4 py-2 text-xs font-semibold text-navy-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reservas.map((r) => <ReservaRow key={r.id} r={r} />)}
        </tbody>
      </table>
    </div>
  );
}
