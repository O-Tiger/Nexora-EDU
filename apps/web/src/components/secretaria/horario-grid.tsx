"use client";

import { useState, useTransition } from "react";
import { Button, toast } from "@nexora/ui";
import { Save, Plus, Minus, CalendarClock } from "lucide-react";
import { setHorarioAction } from "@/actions/horario";

interface Disciplina { id: string; name: string }
interface Slot { diaSemana: number; ordem: number; disciplinaId: string }

interface Props {
  turmaId: string;
  disciplinas: Disciplina[];
  initial: Slot[];
}

const DIAS = [
  { n: 1, label: "Segunda" },
  { n: 2, label: "Terça" },
  { n: 3, label: "Quarta" },
  { n: 4, label: "Quinta" },
  { n: 5, label: "Sexta" },
  { n: 6, label: "Sábado" },
];

export function HorarioGrid({ turmaId, disciplinas, initial }: Props) {
  // nº de linhas (aulas/dia) — começa no maior ordem existente ou 5
  const initialRows = Math.max(5, ...initial.map((s) => s.ordem), 0);
  const [rows, setRows] = useState(initialRows);
  const [showSat, setShowSat] = useState(initial.some((s) => s.diaSemana === 6));
  const [grid, setGrid] = useState<Map<string, string>>(
    () => new Map(initial.map((s) => [`${s.diaSemana}-${s.ordem}`, s.disciplinaId])),
  );
  const [isPending, startTransition] = useTransition();

  const dias = showSat ? DIAS : DIAS.slice(0, 5);

  function setCell(dia: number, ordem: number, disciplinaId: string) {
    setGrid((prev) => {
      const next = new Map(prev);
      const key = `${dia}-${ordem}`;
      if (disciplinaId) next.set(key, disciplinaId); else next.delete(key);
      return next;
    });
  }

  function save() {
    const slots: Slot[] = [];
    for (const [key, disciplinaId] of grid) {
      const [dia, ordem] = key.split("-").map(Number);
      if (dia && ordem && (showSat || dia <= 5) && ordem <= rows) {
        slots.push({ diaSemana: dia, ordem, disciplinaId });
      }
    }
    startTransition(async () => {
      const r = await setHorarioAction(turmaId, slots);
      if ("error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      toast({ title: "Grade de horários salva" });
    });
  }

  if (disciplinas.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-navy-600 uppercase tracking-wide flex items-center gap-2">
          <CalendarClock className="h-4 w-4" /> Grade de horários
        </h2>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Configure as disciplinas da turma (em <strong>Lançar notas</strong>) antes de montar a grade.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-navy-600 uppercase tracking-wide flex items-center gap-2">
          <CalendarClock className="h-4 w-4" /> Grade de horários
        </h2>
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 text-navy-600">
            <input type="checkbox" checked={showSat} onChange={(e) => setShowSat(e.target.checked)} /> Sábado
          </label>
          <div className="flex items-center gap-1">
            <span className="text-navy-500">Aulas/dia:</span>
            <button onClick={() => setRows((r) => Math.max(1, r - 1))} className="rounded border border-navy-200 p-0.5 hover:bg-navy-50" aria-label="Menos linhas"><Minus className="h-3.5 w-3.5" /></button>
            <span className="w-5 text-center font-medium">{rows}</span>
            <button onClick={() => setRows((r) => Math.min(12, r + 1))} className="rounded border border-navy-200 p-0.5 hover:bg-navy-50" aria-label="Mais linhas"><Plus className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-navy-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-50 text-xs text-navy-500">
              <th className="px-2 py-2 w-12 font-semibold">Aula</th>
              {dias.map((d) => <th key={d.n} className="px-2 py-2 font-semibold">{d.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {Array.from({ length: rows }, (_, i) => i + 1).map((ordem) => (
              <tr key={ordem}>
                <td className="px-2 py-1 text-center text-xs font-semibold text-navy-400">{ordem}ª</td>
                {dias.map((d) => (
                  <td key={d.n} className="px-1 py-1">
                    <select
                      value={grid.get(`${d.n}-${ordem}`) ?? ""}
                      onChange={(e) => setCell(d.n, ordem, e.target.value)}
                      className="w-full rounded border border-navy-200 px-1.5 py-1 text-xs"
                      aria-label={`${d.label} ${ordem}ª aula`}
                    >
                      <option value="">—</option>
                      {disciplinas.map((disc) => <option key={disc.id} value={disc.id}>{disc.name}</option>)}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button onClick={save} disabled={isPending} className="gap-2">
        <Save className="h-4 w-4" /> Salvar grade
      </Button>
    </section>
  );
}
