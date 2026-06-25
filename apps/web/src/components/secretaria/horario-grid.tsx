"use client";

import { useState, useTransition } from "react";
import { Button, toast } from "@nexora/ui";
import { Save, Plus, Minus, CalendarClock, Eye, Download } from "lucide-react";
import { setHorarioAction } from "@/actions/horario";

type Frequencia = "SEMANAL" | "QUINZENAL_PAR" | "QUINZENAL_IMPAR";

interface Disciplina { id: string; name: string; color: string | null }
interface Slot { diaSemana: number; ordem: number; disciplinaId: string; frequencia?: Frequencia }
interface TimeCfg { ordem: number; inicio: string; fim: string }

// Per-cell state: semanal (single discipline) or quinzenal (two disciplines, alternating)
type CellMode = "semanal" | "quinzenal";
interface CellState {
  mode: CellMode;
  semanal: string;   // disciplinaId when mode=semanal
  par: string;       // disciplinaId for QUINZENAL_PAR
  impar: string;     // disciplinaId for QUINZENAL_IMPAR
}

const EMPTY_CELL: CellState = { mode: "semanal", semanal: "", par: "", impar: "" };

interface Props {
  turmaId: string;
  disciplinas: Disciplina[];
  initial: Slot[];
  initialConfig: { slots: TimeCfg[]; sabado: boolean };
}

const DIAS = [
  { n: 1, label: "Segunda" }, { n: 2, label: "Terça" }, { n: 3, label: "Quarta" },
  { n: 4, label: "Quinta" }, { n: 5, label: "Sexta" }, { n: 6, label: "Sábado" },
];

function buildInitialCells(initial: Slot[]): Map<string, CellState> {
  const map = new Map<string, CellState>();
  for (const s of initial) {
    const key = `${s.diaSemana}-${s.ordem}`;
    const freq = s.frequencia ?? "SEMANAL";
    const existing = map.get(key) ?? { ...EMPTY_CELL };
    if (freq === "QUINZENAL_PAR") {
      map.set(key, { ...existing, mode: "quinzenal", par: s.disciplinaId });
    } else if (freq === "QUINZENAL_IMPAR") {
      map.set(key, { ...existing, mode: "quinzenal", impar: s.disciplinaId });
    } else {
      map.set(key, { ...existing, mode: "semanal", semanal: s.disciplinaId });
    }
  }
  return map;
}

export function HorarioGrid({ turmaId, disciplinas, initial, initialConfig }: Props) {
  const initialRows = Math.max(5, initialConfig.slots.length, ...initial.map((s) => s.ordem), 0);
  const [rows, setRows] = useState(initialRows);
  const [showSat, setShowSat] = useState(initialConfig.sabado || initial.some((s) => s.diaSemana === 6));
  const [cells, setCells] = useState<Map<string, CellState>>(() => buildInitialCells(initial));
  const [times, setTimes] = useState<Map<number, { inicio: string; fim: string }>>(
    () => new Map(initialConfig.slots.map((s) => [s.ordem, { inicio: s.inicio, fim: s.fim }])),
  );
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState(false);

  const dias = showSat ? DIAS : DIAS.slice(0, 5);
  const colorOf = (id: string) => disciplinas.find((d) => d.id === id)?.color ?? null;

  function getCell(dia: number, ordem: number): CellState {
    return cells.get(`${dia}-${ordem}`) ?? { ...EMPTY_CELL };
  }

  function updateCell(dia: number, ordem: number, patch: Partial<CellState>) {
    const key = `${dia}-${ordem}`;
    setCells((prev) => new Map(prev).set(key, { ...(prev.get(key) ?? { ...EMPTY_CELL }), ...patch }));
  }

  function toggleMode(dia: number, ordem: number) {
    const cur = getCell(dia, ordem);
    if (cur.mode === "semanal") {
      // Switch to quinzenal: carry semanal discipline into par slot
      updateCell(dia, ordem, { mode: "quinzenal", par: cur.semanal, impar: "", semanal: "" });
    } else {
      // Switch back to semanal: carry par discipline into semanal
      updateCell(dia, ordem, { mode: "semanal", semanal: cur.par, par: "", impar: "" });
    }
  }

  function setTime(ordem: number, field: "inicio" | "fim", value: string) {
    setTimes((prev) => {
      const cur = prev.get(ordem) ?? { inicio: "", fim: "" };
      return new Map(prev).set(ordem, { ...cur, [field]: value });
    });
  }

  function save(then?: "preview" | "pdf") {
    const slots: Slot[] = [];
    for (const [key, cell] of cells) {
      const [dia, ordem] = key.split("-").map(Number);
      if (!dia || !ordem || (!showSat && dia > 5) || ordem > rows) continue;
      if (cell.mode === "semanal" && cell.semanal) {
        slots.push({ diaSemana: dia, ordem, disciplinaId: cell.semanal, frequencia: "SEMANAL" });
      } else if (cell.mode === "quinzenal") {
        if (cell.par)   slots.push({ diaSemana: dia, ordem, disciplinaId: cell.par,   frequencia: "QUINZENAL_PAR" });
        if (cell.impar) slots.push({ diaSemana: dia, ordem, disciplinaId: cell.impar, frequencia: "QUINZENAL_IMPAR" });
      }
    }
    const config = {
      slots: Array.from({ length: rows }, (_, i) => {
        const o = i + 1; const t = times.get(o) ?? { inicio: "", fim: "" };
        return { ordem: o, inicio: t.inicio, fim: t.fim };
      }),
      sabado: showSat,
    };
    startTransition(async () => {
      const r = await setHorarioAction(turmaId, { slots, config });
      if ("error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      toast({ title: "Grade salva" });
      if (then === "preview") setPreview(true);
      if (then === "pdf") {
        const a = document.createElement("a");
        a.href = `/api/secretaria/horario?turmaId=${turmaId}&format=pdf`;
        a.download = ""; document.body.appendChild(a); a.click(); a.remove();
      }
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
              <th className="px-2 py-2 w-36 font-semibold">Horário</th>
              {dias.map((d) => <th key={d.n} className="px-2 py-2 font-semibold">{d.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {Array.from({ length: rows }, (_, i) => i + 1).map((ordem) => {
              const t = times.get(ordem) ?? { inicio: "", fim: "" };
              return (
                <tr key={ordem}>
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-navy-400 w-5">{ordem}ª</span>
                      <input type="time" value={t.inicio} onChange={(e) => setTime(ordem, "inicio", e.target.value)}
                        className="w-[5.5rem] rounded border border-navy-200 px-1 py-0.5 text-xs" aria-label={`Início ${ordem}ª aula`} />
                      <input type="time" value={t.fim} onChange={(e) => setTime(ordem, "fim", e.target.value)}
                        className="w-[5.5rem] rounded border border-navy-200 px-1 py-0.5 text-xs" aria-label={`Fim ${ordem}ª aula`} />
                    </div>
                  </td>
                  {dias.map((d) => {
                    const cell = getCell(d.n, ordem);
                    const isQ = cell.mode === "quinzenal";
                    const parColor = isQ && cell.par ? colorOf(cell.par) : null;
                    const imparColor = isQ && cell.impar ? colorOf(cell.impar) : null;
                    const semColor = !isQ && cell.semanal ? colorOf(cell.semanal) : null;

                    return (
                      <td key={d.n} className="px-1 py-1 align-top min-w-[120px]">
                        {!isQ ? (
                          // ── Semanal mode ──────────────────────────────────
                          <div style={semColor ? { background: semColor + "22" } : undefined} className="rounded">
                            <select
                              value={cell.semanal}
                              onChange={(e) => updateCell(d.n, ordem, { semanal: e.target.value })}
                              className="w-full rounded border border-navy-200 px-1.5 py-1 text-xs bg-transparent"
                              aria-label={`${d.label} ${ordem}ª aula`}
                            >
                              <option value="">—</option>
                              {disciplinas.map((disc) => <option key={disc.id} value={disc.id}>{disc.name}</option>)}
                            </select>
                            <button
                              type="button"
                              onClick={() => toggleMode(d.n, ordem)}
                              className="mt-0.5 w-full rounded px-1 py-0.5 text-[10px] font-medium text-navy-400 hover:bg-navy-50 text-center"
                            >
                              Tornar quinzenal
                            </button>
                          </div>
                        ) : (
                          // ── Quinzenal mode — two stacked selects ──────────
                          <div className="space-y-1">
                            <div style={parColor ? { background: parColor + "22" } : undefined} className="rounded border border-amber-200">
                              <div className="px-1 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 rounded-t">Semanas pares</div>
                              <select
                                value={cell.par}
                                onChange={(e) => updateCell(d.n, ordem, { par: e.target.value })}
                                className="w-full rounded-b border-t border-amber-200 px-1.5 py-1 text-xs bg-transparent"
                                aria-label={`${d.label} ${ordem}ª aula — quinzenal par`}
                              >
                                <option value="">—</option>
                                {disciplinas.map((disc) => <option key={disc.id} value={disc.id}>{disc.name}</option>)}
                              </select>
                            </div>
                            <div style={imparColor ? { background: imparColor + "22" } : undefined} className="rounded border border-violet-200">
                              <div className="px-1 py-0.5 text-[10px] font-bold text-violet-700 bg-violet-50 rounded-t">Semanas ímpares</div>
                              <select
                                value={cell.impar}
                                onChange={(e) => updateCell(d.n, ordem, { impar: e.target.value })}
                                className="w-full rounded-b border-t border-violet-200 px-1.5 py-1 text-xs bg-transparent"
                                aria-label={`${d.label} ${ordem}ª aula — quinzenal ímpar`}
                              >
                                <option value="">—</option>
                                {disciplinas.map((disc) => <option key={disc.id} value={disc.id}>{disc.name}</option>)}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleMode(d.n, ordem)}
                              className="w-full rounded px-1 py-0.5 text-[10px] font-medium text-navy-400 hover:bg-navy-50 text-center"
                            >
                              Tornar semanal
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => save()} disabled={isPending} className="gap-2">
          <Save className="h-4 w-4" /> Salvar grade
        </Button>
        <Button onClick={() => save("preview")} variant="outline" disabled={isPending} className="gap-2">
          <Eye className="h-4 w-4" /> Salvar e visualizar
        </Button>
        <Button onClick={() => save("pdf")} variant="outline" disabled={isPending} className="gap-2">
          <Download className="h-4 w-4" /> Salvar e baixar PDF
        </Button>
      </div>

      {preview && (
        <div className="rounded-lg border border-navy-200 overflow-hidden">
          <div className="flex items-center justify-between bg-white px-4 py-2 border-b border-navy-200">
            <span className="text-sm font-medium text-navy-700">Pré-visualização da grade</span>
            <button onClick={() => setPreview(false)} className="text-xs text-navy-400 hover:text-navy-700">Fechar</button>
          </div>
          <iframe src={`/api/secretaria/horario?turmaId=${turmaId}&format=html`} title="Pré-visualização da grade" className="w-full h-[420px] bg-white" />
        </div>
      )}
    </section>
  );
}
