"use client";

import { useState, useTransition } from "react";
import { Button, Input, Textarea, Label, toast } from "@nexora/ui";
import { Plus, CalendarDays, Trash2 } from "lucide-react";
import { createEventoAction, deleteEventoAction } from "@/actions/horario";
import { useConfirm } from "@/hooks/use-confirm";

type Tipo = "PROVA" | "SIMULADO" | "OLIMPIADA" | "TRABALHO" | "REUNIAO" | "PASSEIO" | "FERIADO" | "OUTRO";

interface Evento {
  id: string;
  data: string;
  tipo: Tipo;
  titulo: string;
  descricao: string | null;
}

interface Props {
  turmaId: string;
  eventos: Evento[];
}

const TIPO_META: Record<Tipo, { label: string; cls: string }> = {
  PROVA: { label: "Prova", cls: "bg-red-50 text-red-700" },
  SIMULADO: { label: "Simulado", cls: "bg-orange-50 text-orange-700" },
  OLIMPIADA: { label: "Olimpíada", cls: "bg-purple-50 text-purple-700" },
  TRABALHO: { label: "Trabalho", cls: "bg-blue-50 text-blue-700" },
  REUNIAO: { label: "Reunião", cls: "bg-navy-100 text-navy-700" },
  PASSEIO: { label: "Passeio", cls: "bg-teal-50 text-teal-700" },
  FERIADO: { label: "Feriado", cls: "bg-green-50 text-green-700" },
  OUTRO: { label: "Outro", cls: "bg-navy-50 text-navy-600" },
};

const TIPOS = Object.keys(TIPO_META) as Tipo[];

export function EventosManager({ turmaId, eventos }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("turmaId", turmaId);
    startTransition(async () => {
      const r = await createEventoAction(fd);
      if ("error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      toast({ title: "Evento adicionado" });
      setOpen(false);
      window.location.reload();
    });
  }

  async function remove(id: string, titulo: string) {
    const ok = await confirm({ title: `Excluir "${titulo}"?`, description: "O evento será removido do calendário.", confirmVariant: "destructive" });
    if (!ok) return;
    startTransition(async () => { await deleteEventoAction(id, turmaId); window.location.reload(); });
  }

  return (
    <section className="space-y-3">
      <ConfirmDialog />
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-navy-600 uppercase tracking-wide flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> Eventos ({eventos.length})
        </h2>
        {!open && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Novo evento
          </Button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} className="rounded-lg border border-navy-100 bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="e-data" className="text-xs">Data</Label>
              <Input id="e-data" name="data" type="date" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <select name="tipo" className="w-full rounded-md border border-navy-200 px-3 py-1.5 text-sm" required>
                {TIPOS.map((t) => <option key={t} value={t}>{TIPO_META[t].label}</option>)}
              </select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label htmlFor="e-titulo" className="text-xs">Título</Label>
              <Input id="e-titulo" name="titulo" required maxLength={160} placeholder="Prova de Matemática" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="e-desc" className="text-xs">Descrição (opcional)</Label>
            <Textarea id="e-desc" name="descricao" rows={2} maxLength={1000} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>Adicionar</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      {eventos.length === 0 ? (
        <p className="text-sm text-navy-400">Nenhum evento no calendário.</p>
      ) : (
        <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
          {eventos.map((ev) => {
            const m = TIPO_META[ev.tipo];
            return (
              <div key={ev.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="text-center shrink-0 w-12">
                    <p className="text-xs font-bold text-navy-900">{new Date(ev.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit" })}</p>
                    <p className="text-[10px] text-navy-400 uppercase">{new Date(ev.data + "T00:00:00").toLocaleDateString("pt-BR", { month: "short" })}</p>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-navy-900">{ev.titulo}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${m.cls}`}>{m.label}</span>
                    </div>
                    {ev.descricao && <p className="mt-0.5 text-xs text-navy-500 line-clamp-2">{ev.descricao}</p>}
                  </div>
                </div>
                <button onClick={() => remove(ev.id, ev.titulo)} disabled={isPending} className="p-1 text-navy-300 hover:text-red-500 shrink-0" aria-label="Excluir evento">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
