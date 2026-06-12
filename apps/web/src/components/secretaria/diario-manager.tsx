"use client";

import { useState, useTransition } from "react";
import { Button, Input, Textarea, Label, toast } from "@nexora/ui";
import { Plus, BookText, Check, X, Clock } from "lucide-react";
import { saveRegistroAction, deleteRegistroAction } from "@/actions/diario";
import { useConfirm } from "@/hooks/use-confirm";

interface Student { enrollmentId: string; name: string }
interface Disciplina { id: string; name: string }
interface Registro {
  id: string;
  disciplinaId: string;
  disciplinaName: string;
  data: string;
  quantidadeAulas: number;
  conteudo: string;
  presencasCount: number;
}

type Status = "PRESENTE" | "AUSENTE" | "JUSTIFICADA";

interface Props {
  turmaId: string;
  students: Student[];
  disciplinas: Disciplina[];
  registros: Registro[];
}

const STATUS_CYCLE: Status[] = ["PRESENTE", "AUSENTE", "JUSTIFICADA"];
const STATUS_META: Record<Status, { label: string; short: string; cls: string; Icon: typeof Check }> = {
  PRESENTE: { label: "Presente", short: "P", cls: "bg-teal-50 text-teal-700 border-teal-200", Icon: Check },
  AUSENTE: { label: "Ausente", short: "F", cls: "bg-red-50 text-red-700 border-red-200", Icon: X },
  JUSTIFICADA: { label: "Justificada", short: "J", cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: Clock },
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function DiarioManager({ turmaId, students, disciplinas, registros }: Props) {
  const [open, setOpen] = useState(false);
  const [disciplinaId, setDisciplinaId] = useState(disciplinas[0]?.id ?? "");
  const [data, setData] = useState(todayISO());
  const [quantidadeAulas, setQuantidadeAulas] = useState(1);
  const [conteudo, setConteudo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [presencas, setPresencas] = useState<Map<string, Status>>(
    () => new Map(students.map((s) => [s.enrollmentId, "PRESENTE" as Status])),
  );
  const [isPending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();

  function cycle(enrollmentId: string) {
    setPresencas((prev) => {
      const cur = prev.get(enrollmentId) ?? "PRESENTE";
      const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length]!;
      return new Map(prev).set(enrollmentId, next);
    });
  }

  function setAll(status: Status) {
    setPresencas(new Map(students.map((s) => [s.enrollmentId, status])));
  }

  function reset() {
    setConteudo(""); setObservacoes(""); setQuantidadeAulas(1); setData(todayISO());
    setPresencas(new Map(students.map((s) => [s.enrollmentId, "PRESENTE"])));
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
        presencas: students.map((s) => ({ enrollmentId: s.enrollmentId, status: presencas.get(s.enrollmentId) ?? "PRESENTE" })),
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

  const ausentes = [...presencas.values()].filter((s) => s === "AUSENTE").length;

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
              <Label className="text-xs">Disciplina</Label>
              <select
                value={disciplinaId}
                onChange={(e) => setDisciplinaId(e.target.value)}
                className="w-full rounded-md border border-navy-200 px-3 py-1.5 text-sm"
              >
                {disciplinas.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="d-data" className="text-xs">Data</Label>
              <Input id="d-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="d-qtd" className="text-xs">Nº de aulas</Label>
              <Input id="d-qtd" type="number" min={1} max={10} value={quantidadeAulas}
                onChange={(e) => setQuantidadeAulas(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} />
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

          {/* Chamada / presença */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Chamada {ausentes > 0 && <span className="text-red-500">· {ausentes} ausente(s)</span>}</Label>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => setAll("PRESENTE")} className="text-teal-600 hover:underline">Todos presentes</button>
                <span className="text-navy-200">|</span>
                <span className="text-navy-400">Clique no status para alternar</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-72 overflow-y-auto">
              {students.map((s) => {
                const st = presencas.get(s.enrollmentId) ?? "PRESENTE";
                const m = STATUS_META[st];
                return (
                  <div key={s.enrollmentId} className="flex items-center justify-between rounded-md border border-navy-100 px-3 py-1.5">
                    <span className="text-sm text-navy-800 truncate">{s.name}</span>
                    <button
                      type="button"
                      onClick={() => cycle(s.enrollmentId)}
                      className={`flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${m.cls}`}
                      aria-label={`${s.name}: ${m.label} (clique para alternar)`}
                    >
                      <m.Icon className="h-3 w-3" /> {m.label}
                    </button>
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-navy-900">{r.disciplinaName}</span>
                    <span className="text-xs text-navy-400">
                      {new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")} · {r.quantidadeAulas} aula{r.quantidadeAulas !== 1 ? "s" : ""}
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
