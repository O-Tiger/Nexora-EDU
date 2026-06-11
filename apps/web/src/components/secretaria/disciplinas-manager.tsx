"use client";

import { useState, useTransition } from "react";
import { Button, Input, toast } from "@nexora/ui";
import { Plus, Trash2, CornerDownRight, BookMarked } from "lucide-react";
import { createDisciplinaAction, deleteDisciplinaAction } from "@/actions/pedagogico";
import { useConfirm } from "@/hooks/use-confirm";

interface Frente { id: string; name: string; position: number }
interface Disciplina { id: string; name: string; position: number; frentes: Frente[] }

export function DisciplinasManager({ initial }: { initial: Disciplina[] }) {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>(initial);
  const [newName, setNewName] = useState("");
  const [frenteFor, setFrenteFor] = useState<string | null>(null);
  const [frenteName, setFrenteName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();

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

      {disciplinas.length === 0 ? (
        <p className="text-sm text-navy-400">Nenhuma disciplina cadastrada.</p>
      ) : (
        <div className="space-y-2">
          {disciplinas.map((d) => (
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
                      <button
                        onClick={() => remove(f.id, f.name, false)}
                        disabled={isPending}
                        className="p-1 text-navy-300 hover:text-red-500"
                        aria-label={`Excluir ${f.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
