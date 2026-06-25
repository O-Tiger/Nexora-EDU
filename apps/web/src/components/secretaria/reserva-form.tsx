"use client";

import { useState, useTransition } from "react";
import { Button, Input, Label, toast } from "@nexora/ui";
import { Plus } from "lucide-react";
import { createReservaAction } from "@/actions/reservas";

type AlunoEnrollment = { studentId: string; studentName: string; turmaId: string; turmaCode: string };

type Props = {
  anoLetivoAtualId: string;
  proximoAnoLetivoId: string;
  proximoAno: number;
  alunosEnrollments: AlunoEnrollment[];
};

export function ReservaForm({ anoLetivoAtualId, proximoAnoLetivoId, proximoAno, alunosEnrollments }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const enrollment = alunosEnrollments.find((a) => a.studentId === fd.get("studentId"));
    if (!enrollment) return;

    const taxaReais = parseFloat(String(fd.get("taxaReais")).replace(",", "."));
    const data = {
      studentId: enrollment.studentId,
      anoLetivoAtualId,
      turmaAtualId: enrollment.turmaId,
      proximoAnoLetivoId,
      taxaReservaCents: Math.round(taxaReais * 100),
      vencimentoDia: Number(fd.get("vencimentoDia")),
      notes: String(fd.get("notes") || ""),
    };

    startTransition(async () => {
      const r = await createReservaAction(data);
      if ("error" in r) {
        toast({ variant: "destructive", title: "Erro ao criar reserva", description: r.error });
        return;
      }
      toast({
        title: "Reserva criada",
        description: `Vaga reservada para ${r.turmaProximaCode}${r.turmaCriada ? " (turma criada automaticamente com disciplinas herdadas)" : ""}`,
      });
      setOpen(false);
      (e.target as HTMLFormElement).reset();
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nova reserva de vaga
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-navy-100 bg-white p-4 space-y-4">
      <p className="text-sm font-semibold text-navy-900">Nova reserva de vaga — {proximoAno}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="rv-student" className="text-xs">Aluno</Label>
          <select id="rv-student" name="studentId" required
            className="w-full rounded-md border border-navy-200 px-3 py-2 text-sm">
            <option value="">Selecione o aluno</option>
            {alunosEnrollments.map((a) => (
              <option key={a.studentId} value={a.studentId}>
                {a.studentName} — {a.turmaCode}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="rv-taxa" className="text-xs">Taxa de reserva (R$)</Label>
          <Input id="rv-taxa" name="taxaReais" type="number" min="0.01" step="0.01" placeholder="500,00" required />
        </div>

        <div className="space-y-1">
          <Label htmlFor="rv-dia" className="text-xs">Vencimento (dia do mês)</Label>
          <Input id="rv-dia" name="vencimentoDia" type="number" min={1} max={28} defaultValue={10} required />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="rv-notes" className="text-xs">Observações</Label>
          <Input id="rv-notes" name="notes" placeholder="Observações sobre a entrevista..." maxLength={500} />
        </div>
      </div>

      <p className="text-xs text-navy-400">
        A turma do próximo ano letivo será criada automaticamente caso não exista,
        herdando as disciplinas da turma atual. Professores e horário devem ser configurados pelo admin.
      </p>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>Criar reserva</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
