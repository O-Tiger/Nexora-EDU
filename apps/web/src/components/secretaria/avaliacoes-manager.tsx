"use client";

import { useState, useTransition } from "react";
import { Button, toast } from "@nexora/ui";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { saveAvaliacaoConfigAction, deleteAvaliacaoConfigAction } from "@/actions/avaliacoes";

type TipoAvaliacao = "NOTA" | "SOMA" | "MEDIA" | "CONCEITO" | "SEM_INFLUENCIA";

interface AvaliacaoConfig {
  id: string;
  sigla: string;
  label: string;
  periodo: number;
  isRecuperacao: boolean;
  tipo: TipoAvaliacao;
  peso: number | null;
  obrigatoria: boolean;
  ordem: number;
}

const TIPO_LABELS: Record<TipoAvaliacao, string> = {
  NOTA: "Nota (0–10)",
  SOMA: "Soma de pontos",
  MEDIA: "Média",
  CONCEITO: "Conceito (A–E)",
  SEM_INFLUENCIA: "Sem influência",
};

const EMPTY: Omit<AvaliacaoConfig, "id"> = {
  sigla: "",
  label: "",
  periodo: 1,
  isRecuperacao: false,
  tipo: "NOTA",
  peso: null,
  obrigatoria: true,
  ordem: 1,
};

interface FormState extends Omit<AvaliacaoConfig, "id"> { id?: string }

export function AvaliacoesManager({ initial }: { initial: AvaliacaoConfig[] }) {
  const [configs, setConfigs] = useState(initial);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [isPending, startTransition] = useTransition();

  function startNew(nextOrdem: number) {
    setEditing({ ...EMPTY, ordem: nextOrdem });
  }

  function startEdit(c: AvaliacaoConfig) {
    setEditing({ ...c });
  }

  function cancel() { setEditing(null); }

  function handleChange(field: keyof FormState, value: unknown) {
    setEditing((prev) => prev ? { ...prev, [field]: value } : null);
  }

  function save() {
    if (!editing) return;
    startTransition(async () => {
      const res = await saveAvaliacaoConfigAction(editing);
      if (res.error) {
        toast({ variant: "destructive", title: res.error });
        return;
      }
      toast({ title: editing.id ? "Avaliação atualizada" : "Avaliação criada" });
      setEditing(null);
      // Refresh is handled by revalidatePath on server; optimistic update here
      window.location.reload();
    });
  }

  function remove(id: string, sigla: string) {
    if (!confirm(`Remover a avaliação "${sigla}"? Isso apagará todas as notas lançadas para ela.`)) return;
    startTransition(async () => {
      const res = await deleteAvaliacaoConfigAction(id);
      if (res.error) {
        toast({ variant: "destructive", title: res.error });
        return;
      }
      toast({ title: "Avaliação removida" });
      setConfigs((prev) => prev.filter((c) => c.id !== id));
    });
  }

  const sorted = [...configs].sort((a, b) => a.ordem - b.ordem);
  const nextOrdem = configs.length > 0 ? Math.max(...configs.map((c) => c.ordem)) + 1 : 1;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-navy-700">Avaliações configuradas ({configs.length})</span>
          <Button size="sm" onClick={() => startNew(nextOrdem)} className="gap-2" disabled={isPending}>
            <Plus className="h-4 w-4" /> Nova avaliação
          </Button>
        </div>

        {sorted.length === 0 && (
          <p className="px-4 py-6 text-sm text-navy-400 text-center">Nenhuma avaliação configurada.</p>
        )}

        {sorted.map((c) => (
          <div key={c.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <span className="font-mono font-bold text-navy-800 text-sm">{c.sigla}</span>
              <span className="ml-2 text-navy-500 text-sm">{c.label}</span>
              <div className="flex gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-navy-400">
                  {c.periodo === 0 ? (c.isRecuperacao ? "Recuperação global" : "Prova Final") : `Período ${c.periodo}${c.isRecuperacao ? " (rec.)" : ""}`}
                </span>
                <span className="text-xs text-navy-400">·</span>
                <span className="text-xs text-navy-400">{TIPO_LABELS[c.tipo]}</span>
                {c.peso != null && <><span className="text-xs text-navy-400">·</span><span className="text-xs text-navy-400">Peso {c.peso}</span></>}
                {!c.obrigatoria && <span className="text-xs text-amber-500">opcional</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => startEdit(c)} className="p-1.5 text-navy-400 hover:text-navy-700" title="Editar">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => remove(c.id, c.sigla)} className="p-1.5 text-navy-400 hover:text-red-600" title="Remover">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-teal-800">{editing.id ? "Editar avaliação" : "Nova avaliação"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-navy-600">Sigla *</label>
              <input
                value={editing.sigla} onChange={(e) => handleChange("sigla", e.target.value)}
                maxLength={20} placeholder="Ex: AV1, TI, PF"
                className="w-full rounded border border-navy-200 px-2.5 py-1.5 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-navy-600">Rótulo completo *</label>
              <input
                value={editing.label} onChange={(e) => handleChange("label", e.target.value)}
                maxLength={100} placeholder="Ex: 1ª Avaliação Trimestral"
                className="w-full rounded border border-navy-200 px-2.5 py-1.5 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-navy-600">Período (0 = global)</label>
              <input
                type="number" min={0} max={10} value={editing.periodo}
                onChange={(e) => handleChange("periodo", Number(e.target.value))}
                className="w-full rounded border border-navy-200 px-2.5 py-1.5 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-navy-600">Tipo</label>
              <select value={editing.tipo} onChange={(e) => handleChange("tipo", e.target.value as TipoAvaliacao)}
                className="w-full rounded border border-navy-200 px-2.5 py-1.5 text-sm">
                {(Object.keys(TIPO_LABELS) as TipoAvaliacao[]).map((t) => (
                  <option key={t} value={t}>{TIPO_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-navy-600">Peso (opcional)</label>
              <input
                type="number" min={0} max={100} step="0.1"
                value={editing.peso ?? ""}
                onChange={(e) => handleChange("peso", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="Deixe em branco para peso igual"
                className="w-full rounded border border-navy-200 px-2.5 py-1.5 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-navy-600">Ordem de exibição</label>
              <input
                type="number" min={1} value={editing.ordem}
                onChange={(e) => handleChange("ordem", Number(e.target.value))}
                className="w-full rounded border border-navy-200 px-2.5 py-1.5 text-sm"
              />
            </div>
            <div className="flex items-center gap-4 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={editing.isRecuperacao} onChange={(e) => handleChange("isRecuperacao", e.target.checked)} />
                É recuperação (eleva nota do período se maior)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={editing.obrigatoria} onChange={(e) => handleChange("obrigatoria", e.target.checked)} />
                Obrigatória
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={isPending || !editing.sigla || !editing.label} className="gap-2">
              <Check className="h-4 w-4" /> Salvar
            </Button>
            <Button size="sm" variant="outline" onClick={cancel} className="gap-2">
              <X className="h-4 w-4" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-navy-400">
        As avaliações são globais para a instituição. Mudanças afetam todos os lançamentos novos.
      </p>
    </div>
  );
}
