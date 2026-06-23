"use client";

import { useState, useTransition } from "react";
import { Button, Input, Textarea, Label, toast } from "@nexora/ui";
import { Plus, Minus, BookText, X } from "lucide-react";
import { saveRegistroAction, deleteRegistroAction } from "@/actions/diario";
import { useConfirm } from "@/hooks/use-confirm";

interface Student { enrollmentId: string; name: string }
interface Disciplina { id: string; name: string }
interface HorarioSlot { disciplinaId: string; diaSemana: number; frequencia: string }
interface Registro {
  id: string;
  disciplinaId: string;
  disciplinaName: string;
  data: string;
  quantidadeAulas: number;
  conteudo: string;
  presencasCount: number;
}

interface Presenca { faltas: number; justificadas: number }

interface Props {
  turmaId: string;
  students: Student[];
  disciplinas: Disciplina[];
  registros: Registro[];
  horarioSlots?: HorarioSlot[];
}

/** ISO week number (1-based). */
function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function weekFrequencia(dateStr: string): "QUINZENAL_PAR" | "QUINZENAL_IMPAR" {
  const d = new Date(dateStr + "T12:00:00");
  return isoWeek(d) % 2 === 0 ? "QUINZENAL_PAR" : "QUINZENAL_IMPAR";
}

function filterDisciplinas(
  all: Disciplina[],
  slots: HorarioSlot[],
  dateStr: string,
): { visible: Disciplina[]; parityLabel: string | null } {
  if (slots.length === 0) return { visible: all, parityLabel: null };
  const date = new Date(dateStr + "T12:00:00");
  // JS: 0=Sun → map to 1=Mon..6=Sat (ignore Sun=0)
  const jsDay = date.getDay();
  const diaSemana = jsDay === 0 ? 7 : jsDay;
  const slotsForDay = slots.filter((s) => s.diaSemana === diaSemana);
  if (slotsForDay.length === 0) return { visible: all, parityLabel: null };
  const freq = weekFrequencia(dateStr);
  const validIds = new Set(
    slotsForDay
      .filter((s) => s.frequencia === "SEMANAL" || s.frequencia === freq)
      .map((s) => s.disciplinaId),
  );
  const visible = all.filter((d) => validIds.has(d.id));
  const hasQuinzenal = slotsForDay.some((s) => s.frequencia !== "SEMANAL");
  const parityLabel = hasQuinzenal
    ? freq === "QUINZENAL_PAR" ? "Semana par (semana " + isoWeek(date) + ")" : "Semana ímpar (semana " + isoWeek(date) + ")"
    : null;
  return { visible: visible.length > 0 ? visible : all, parityLabel };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function statusLabel(p: Presenca, n: number): { text: string; cls: string } {
  const total = p.faltas + p.justificadas;
  if (total === 0) return { text: "Presente", cls: "text-teal-600" };
  if (p.faltas >= n) return { text: "Ausente", cls: "text-red-600" };
  if (p.faltas === 0) return { text: "Justificada", cls: "text-amber-600" };
  return { text: "Parcial", cls: "text-amber-600" };
}

export function DiarioManager({ turmaId, students, disciplinas, registros, horarioSlots = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(todayISO());
  const { visible: discsFiltradas, parityLabel } = filterDisciplinas(disciplinas, horarioSlots, data);
  const [disciplinaId, setDisciplinaId] = useState(disciplinas[0]?.id ?? "");
  const [quantidadeAulas, setQuantidadeAulas] = useState(1);
  const [conteudo, setConteudo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [presencas, setPresencas] = useState<Map<string, Presenca>>(
    () => new Map(students.map((s) => [s.enrollmentId, { faltas: 0, justificadas: 0 }])),
  );
  const [isPending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();

  function setField(enrollmentId: string, field: keyof Presenca, delta: number) {
    setPresencas((prev) => {
      const cur = prev.get(enrollmentId) ?? { faltas: 0, justificadas: 0 };
      const next = { ...cur, [field]: Math.max(0, cur[field] + delta) };
      // Garante faltas + justificadas <= quantidadeAulas
      if (next.faltas + next.justificadas > quantidadeAulas) return prev;
      return new Map(prev).set(enrollmentId, next);
    });
  }

  function resetPresencas() {
    setPresencas(new Map(students.map((s) => [s.enrollmentId, { faltas: 0, justificadas: 0 }])));
  }

  function handleDataChange(newDate: string) {
    setData(newDate);
    const { visible } = filterDisciplinas(disciplinas, horarioSlots, newDate);
    if (!visible.some((d) => d.id === disciplinaId)) {
      setDisciplinaId(visible[0]?.id ?? disciplinas[0]?.id ?? "");
    }
  }

  function reset() {
    const today = todayISO();
    setConteudo(""); setObservacoes(""); setQuantidadeAulas(1); setData(today);
    resetPresencas();
    const { visible } = filterDisciplinas(disciplinas, horarioSlots, today);
    setDisciplinaId(visible[0]?.id ?? disciplinas[0]?.id ?? "");
  }

  function save() {
    if (!disciplinaId) { toast({ variant: "destructive", title: "Selecione a disciplina" }); return; }
    if (!conteudo.trim()) { toast({ variant: "destructive", title: "Informe o conteúdo ministrado" }); return; }
    startTransition(async () => {
      const r = await saveRegistroAction({
        turmaId,
        disciplinaId,
        data,
        quantidadeAulas,
        conteudo,
        observacoes: observacoes || undefined,
        presencas: students.map((s) => {
          const p = presencas.get(s.enrollmentId) ?? { faltas: 0, justificadas: 0 };
          return { enrollmentId: s.enrollmentId, faltas: p.faltas, justificadas: p.justificadas };
        }),
      });
      if ("error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      toast({ title: "Aula registrada" });
      reset();
      setOpen(false);
      window.location.reload();
    });
  }

  async function remove(id: string, label: string) {
    const ok = await confirm({
      title: `Excluir registro de ${label}?`,
      description: "O registro e as presenças vinculadas serão removidos.",
      confirmVariant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteRegistroAction(id, turmaId);
      window.location.reload();
    });
  }

  const totalFaltas = [...presencas.values()].reduce((a, p) => a + p.faltas, 0);

  return (
    <div className="space-y-5">
      <ConfirmDialog />

      {disciplinas.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Esta turma ainda não tem disciplinas. Configure em <strong>Lançar notas → Disciplinas da turma</strong> primeiro.
        </p>
      ) : !open ? (
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Registrar aula
        </Button>
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); save(); }}
          className="rounded-lg border border-navy-100 bg-white p-4 space-y-4"
        >
          <p className="text-sm font-semibold text-navy-900">Novo registro de aula</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1 col-span-2">
              <Label className="text-xs flex items-center gap-2">
                Disciplina
                {parityLabel && <span className="font-normal text-amber-600">{parityLabel}</span>}
              </Label>
              <select
                value={disciplinaId}
                onChange={(e) => setDisciplinaId(e.target.value)}
                className="w-full rounded-md border border-navy-200 px-3 py-1.5 text-sm"
              >
                {discsFiltradas.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="d-data" className="text-xs">Data</Label>
              <Input id="d-data" type="date" value={data} onChange={(e) => handleDataChange(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="d-qtd" className="text-xs">Nº de aulas</Label>
              <Input id="d-qtd" type="number" min={1} max={10} value={quantidadeAulas}
                onChange={(e) => {
                  const n = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                  setQuantidadeAulas(n);
                  // Reclampa presenças que excedam o novo total
                  setPresencas((prev) => {
                    const next = new Map(prev);
                    for (const [k, p] of next) {
                      if (p.faltas + p.justificadas > n) {
                        next.set(k, { faltas: Math.min(p.faltas, n), justificadas: 0 });
                      }
                    }
                    return next;
                  });
                }} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="d-cont" className="text-xs">Conteúdo ministrado</Label>
            <Textarea id="d-cont" value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={2} maxLength={2000} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="d-obs" className="text-xs">Observações (opcional)</Label>
            <Input id="d-obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} maxLength={1000} />
          </div>

          {/* Chamada */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                Chamada {totalFaltas > 0 && <span className="text-red-500">· {totalFaltas} falta(s)</span>}
              </Label>
              <div className="flex items-center gap-2 text-xs">
                <button type="button" onClick={resetPresencas} className="text-teal-600 hover:underline">Todos presentes</button>
                {quantidadeAulas > 1 && <span className="text-navy-400">Faltas parciais (0–{quantidadeAulas})</span>}
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-navy-50 rounded-md border border-navy-100">
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 bg-navy-50 px-3 py-1.5 text-[10px] font-semibold uppercase text-navy-400">
                <span>Aluno</span>
                <span className="text-center w-28">Faltas</span>
                <span className="text-center w-28">Justificadas</span>
              </div>
              {students.map((s) => {
                const p = presencas.get(s.enrollmentId) ?? { faltas: 0, justificadas: 0 };
                const st = statusLabel(p, quantidadeAulas);
                return (
                  <div key={s.enrollmentId} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-1.5">
                    <div className="min-w-0">
                      <span className="text-sm text-navy-800 truncate">{s.name}</span>
                      <span className={`ml-2 text-[11px] ${st.cls}`}>{st.text}</span>
                    </div>
                    <Stepper
                      value={p.faltas}
                      onDec={() => setField(s.enrollmentId, "faltas", -1)}
                      onInc={() => setField(s.enrollmentId, "faltas", +1)}
                      max={quantidadeAulas - p.justificadas}
                      ariaLabel={`Faltas de ${s.name}`}
                    />
                    <Stepper
                      value={p.justificadas}
                      onDec={() => setField(s.enrollmentId, "justificadas", -1)}
                      onInc={() => setField(s.enrollmentId, "justificadas", +1)}
                      max={quantidadeAulas - p.faltas}
                      ariaLabel={`Justificadas de ${s.name}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>Salvar registro</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setOpen(false); reset(); }}>Cancelar</Button>
          </div>
        </form>
      )}

      {/* Lista de registros */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-navy-600 uppercase tracking-wide flex items-center gap-2">
          <BookText className="h-4 w-4" /> Registros ({registros.length})
        </h2>
        {registros.length === 0 ? (
          <p className="text-sm text-navy-400">Nenhuma aula registrada ainda.</p>
        ) : (
          <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
            {registros.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-navy-900">{r.disciplinaName}</span>
                    <span className="text-xs text-navy-400">
                      {new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")} · {r.quantidadeAulas} aula{r.quantidadeAulas !== 1 ? "s" : ""}
                      {r.presencasCount > 0 && ` · ${r.presencasCount} com falta`}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-navy-600 line-clamp-2">{r.conteudo}</p>
                </div>
                <button
                  onClick={() => remove(r.id, `${r.disciplinaName} (${new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")})`)}
                  disabled={isPending}
                  className="p-1 text-navy-300 hover:text-red-500 shrink-0"
                  aria-label="Excluir registro"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stepper({ value, onDec, onInc, max, ariaLabel }: {
  value: number; onDec: () => void; onInc: () => void; max: number; ariaLabel: string;
}) {
  return (
    <div className="flex items-center gap-1 w-28 justify-center" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        onClick={onDec}
        disabled={value <= 0}
        className="rounded border border-navy-200 p-0.5 text-navy-500 hover:bg-navy-50 disabled:opacity-30"
        aria-label="Diminuir"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className={`w-5 text-center text-sm tabular-nums ${value > 0 ? "font-semibold text-navy-900" : "text-navy-400"}`}>{value}</span>
      <button
        type="button"
        onClick={onInc}
        disabled={value >= max}
        className="rounded border border-navy-200 p-0.5 text-navy-500 hover:bg-navy-50 disabled:opacity-30"
        aria-label="Aumentar"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
