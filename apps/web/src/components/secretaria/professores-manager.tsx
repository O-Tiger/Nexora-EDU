"use client";

import { useState, useTransition } from "react";
import { Button, Input, Label, toast } from "@nexora/ui";
import { Plus, Trash2, UserCog, Mail, Phone } from "lucide-react";
import { createProfessorAction, deleteProfessorAction } from "@/actions/professores";
import { useConfirm } from "@/hooks/use-confirm";

interface Vinculo { turmaCode: string; disciplinaName: string }
interface Professor { id: string; name: string; email: string | null; phone: string | null; vinculos: Vinculo[] }

export function ProfessoresManager({ initial }: { initial: Professor[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createProfessorAction(fd);
      if ("error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      toast({ title: "Professor cadastrado" });
      setOpen(false);
      window.location.reload();
    });
  }

  async function remove(id: string, name: string, nVinculos: number) {
    const ok = await confirm({
      title: `Excluir ${name}?`,
      description: nVinculos > 0
        ? `Este professor está vinculado a ${nVinculos} disciplina(s) — os vínculos serão removidos.`
        : "O professor será removido.",
      confirmVariant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => { await deleteProfessorAction(id); window.location.reload(); });
  }

  return (
    <div className="space-y-4">
      <ConfirmDialog />

      {!open ? (
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Cadastrar professor
        </Button>
      ) : (
        <form onSubmit={submit} className="rounded-lg border border-navy-100 bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-navy-900">Novo professor</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1 sm:col-span-1">
              <Label htmlFor="p-name" className="text-xs">Nome</Label>
              <Input id="p-name" name="name" required maxLength={120} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-email" className="text-xs">Email (opcional)</Label>
              <Input id="p-email" name="email" type="email" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-phone" className="text-xs">Telefone (opcional)</Label>
              <Input id="p-phone" name="phone" type="tel" maxLength={20} />
            </div>
          </div>
          <p className="text-xs text-navy-400">Professores não têm login — são apenas cadastro interno para a grade.</p>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>Cadastrar</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      {initial.length === 0 ? (
        <p className="text-sm text-navy-400">Nenhum professor cadastrado.</p>
      ) : (
        <div className="space-y-3">
          {initial.map((p) => (
            <div key={p.id} className="rounded-lg border border-navy-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-navy-900 flex items-center gap-2">
                    <UserCog className="h-4 w-4 text-teal-500 shrink-0" /> {p.name}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                    {p.email && <span className="flex items-center gap-1 text-xs text-navy-400"><Mail className="h-3 w-3" /> {p.email}</span>}
                    {p.phone && <span className="flex items-center gap-1 text-xs text-navy-400"><Phone className="h-3 w-3" /> {p.phone}</span>}
                  </div>
                </div>
                <button
                  onClick={() => remove(p.id, p.name, p.vinculos.length)}
                  disabled={isPending}
                  className="p-1 text-navy-300 hover:text-red-500 shrink-0"
                  aria-label={`Excluir ${p.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {p.vinculos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.vinculos.map((v, i) => (
                    <span key={i} className="rounded bg-navy-50 px-2 py-1 text-xs text-navy-700">
                      <span className="font-mono">{v.turmaCode}</span> · {v.disciplinaName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
