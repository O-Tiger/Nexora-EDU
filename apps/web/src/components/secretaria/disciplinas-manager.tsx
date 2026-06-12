"use client";

import { useState, useTransition, useMemo } from "react";
import { Button, Input, toast } from "@nexora/ui";
import { Plus, Trash2, CornerDownRight, BookMarked, ArrowDownUp } from "lucide-react";
import { createDisciplinaAction, deleteDisciplinaAction, setDisciplinaColorAction, setMateriaColorAction } from "@/actions/pedagogico";
import { useConfirm } from "@/hooks/use-confirm";

interface Frente { id: string; name: string; position: number; color: string | null }
interface Disciplina { id: string; name: string; position: number; color: string | null; frentes: Frente[] }

type SortMode = "alpha" | "alpha-desc" | "frentes-desc" | "frentes-asc";
const SORT_LABELS: Record<SortMode, string> = {
  alpha: "Nome (A–Z)",
  "alpha-desc": "Nome (Z–A)",
  "frentes-desc": "Mais frentes",
  "frentes-asc": "Menos frentes",
};

export function DisciplinasManager({ initial }: { initial: Disciplina[] }) {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>(initial);
  const [newName, setNewName] = useState("");
  const [frenteFor, setFrenteFor] = useState<string | null>(null);
  const [frenteName, setFrenteName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();
  const [sort, setSort] = useState<SortMode>("alpha");

  const sorted = useMemo(() => {
    const arr = [...disciplinas];
    switch (sort) {
      case "alpha": return arr.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      case "alpha-desc": return arr.sort((a, b) => b.name.localeCompare(a.name, "pt-BR"));
      case "frentes-desc": return arr.sort((a, b) => b.frentes.length - a.frentes.length || a.name.localeCompare(b.name, "pt-BR"));
      case "frentes-asc": return arr.sort((a, b) => a.frentes.length - b.frentes.length || a.name.localeCompare(b.name, "pt-BR"));
    }
  }, [disciplinas, sort]);

  // Cor da matéria (raiz): aplica variantes às frentes
  function setMateriaColor(parentId: string, color: string) {
    setDisciplinas((prev) => prev.map((d) => d.id === parentId ? { ...d, color } : d));
    startTransition(async () => {
      const r = await setMateriaColorAction(parentId, color);
      if ("colors" in r && r.colors) {
        const colors = r.colors;
        setDisciplinas((prev) => prev.map((d) =>
          d.id === parentId
            ? { ...d, color: colors[d.id] ?? color, frentes: d.frentes.map((f) => ({ ...f, color: colors[f.id] ?? f.color })) }
            : d,
        ));
      }
    });
  }

  // Override manual da cor de uma frente
  function setFrenteColor(frenteId: string, color: string) {
    setDisciplinas((prev) => prev.map((d) => ({ ...d, frentes: d.frentes.map((f) => f.id === frenteId ? { ...f, color } : f) })));
    startTransition(async () => { await setDisciplinaColorAction(frenteId, color); });
  }

  function addRoot() {
    if (!newName.trim()) return;
    const name = newName.trim();
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("position", String(disciplinas.length));
      const r = await createDisciplinaAction(fd);
      if ("error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      // refetch-lite: optimistic — id desconhecido, força reload da página
      window.location.reload();
    });
    setNewName("");
  }

  function addFrente(parentId: string) {
    if (!frenteName.trim()) return;
    const name = frenteName.trim();
    const parent = disciplinas.find((d) => d.id === parentId);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("parentId", parentId);
      fd.set("position", String(parent?.frentes.length ?? 0));
      const r = await createDisciplinaAction(fd);
      if ("error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      window.location.reload();
    });
    setFrenteName("");
    setFrenteFor(null);
  }

  async function remove(id: string, name: string, hasFrentes: boolean) {
    const ok = await confirm({
      title: `Excluir ${name}?`,
      description: hasFrentes ? "As frentes desta disciplina também serão excluídas." : "Esta ação é irreversível.",
      confirmVariant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteDisciplinaAction(id);
      setDisciplinas((prev) => prev.filter((d) => d.id !== id).map((d) => ({
        ...d, frentes: d.frentes.filter((f) => f.id !== id),
      })));
    });
  }

  return (
    <div className="space-y-4">
      <ConfirmDialog />

      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nova disciplina (ex: Matemática)"
          onKeyDown={(e) => e.key === "Enter" && addRoot()}
          maxLength={80}
        />
        <Button onClick={addRoot} disabled={isPending || !newName.trim()} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {disciplinas.length > 1 && (
        <div className="flex items-center gap-2 text-xs">
          <ArrowDownUp className="h-3.5 w-3.5 text-navy-400" />
          <span className="text-navy-500">Ordenar:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="rounded-md border border-navy-200 px-2 py-1 text-xs"
            aria-label="Ordenar disciplinas"
          >
            {(Object.keys(SORT_LABELS) as SortMode[]).map((s) => <option key={s} value={s}>{SORT_LABELS[s]}</option>)}
          </select>
        </div>
      )}

      {disciplinas.length === 0 ? (
        <p className="text-sm text-navy-400">Nenhuma disciplina cadastrada.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((d) => (
            <div key={d.id} className="rounded-lg border border-navy-100 bg-white">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <BookMarked className="h-4 w-4 text-teal-500" aria-hidden="true" />
                  <span className="font-medium text-navy-900">{d.name}</span>
                  {d.frentes.length > 0 && (
                    <span className="text-xs text-navy-400">{d.frentes.length} frente{d.frentes.length !== 1 ? "s" : ""}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={d.color ?? "#0d9488"}
                    onChange={(e) => setMateriaColor(d.id, e.target.value)}
                    className="h-6 w-7 rounded border border-navy-200 cursor-pointer"
                    title={d.frentes.length > 0 ? "Cor da matéria (gera tons nas frentes)" : "Cor na grade de horários"}
                    aria-label={`Cor de ${d.name}`}
                  />
                  <button
                    onClick={() => { setFrenteFor(frenteFor === d.id ? null : d.id); setFrenteName(""); }}
                    className="text-xs text-teal-600 hover:underline"
                  >
                    + frente
                  </button>
                  <button
                    onClick={() => remove(d.id, d.name, d.frentes.length > 0)}
                    disabled={isPending}
                    className="p-1 text-navy-300 hover:text-red-500"
                    aria-label={`Excluir ${d.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {d.frentes.length > 0 && (
                <div className="border-t border-navy-50 divide-y divide-navy-50">
                  {d.frentes.map((f) => (
                    <div key={f.id} className="flex items-center justify-between px-4 py-2 pl-10">
                      <span className="flex items-center gap-2 text-sm text-navy-600">
                        <CornerDownRight className="h-3.5 w-3.5 text-navy-300" aria-hidden="true" />
                        {f.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={f.color ?? "#0d9488"}
                          onChange={(e) => setFrenteColor(f.id, e.target.value)}
                          className="h-5 w-6 rounded border border-navy-200 cursor-pointer"
                          title="Tom da frente (override manual)"
                          aria-label={`Cor de ${f.name}`}
                        />
                        <button
                          onClick={() => remove(f.id, f.name, false)}
                          disabled={isPending}
                          className="p-1 text-navy-300 hover:text-red-500"
                          aria-label={`Excluir ${f.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {frenteFor === d.id && (
                <div className="border-t border-navy-50 flex gap-2 px-4 py-2 pl-10">
                  <Input
                    value={frenteName}
                    onChange={(e) => setFrenteName(e.target.value)}
                    placeholder={`Frente de ${d.name} (ex: ${d.name} 1)`}
                    onKeyDown={(e) => e.key === "Enter" && addFrente(d.id)}
                    maxLength={80}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" onClick={() => addFrente(d.id)} disabled={isPending || !frenteName.trim()}>
                    Salvar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
