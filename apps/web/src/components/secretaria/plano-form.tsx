"use client";

import { useState, useTransition } from "react";
import { Button, Input, Label, toast } from "@nexora/ui";
import { Plus } from "lucide-react";
import { createPlanoCobrancaAction } from "@/actions/financeiro";
import { MESES_LABELS } from "@nexora/validators";

const MESES_LIST = Array.from({ length: 12 }, (_, i) => i + 1);

type Props = {
  anoLetivoId: string;
  turmas?: { id: string; code: string }[];
};

export function PlanoForm({ anoLetivoId, turmas = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mesesSelecionados, setMesesSelecionados] = useState<number[]>([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

  function toggleMes(mes: number) {
    setMesesSelecionados((prev) =>
      prev.includes(mes) ? prev.filter((m) => m !== mes) : [...prev, mes].sort((a, b) => a - b),
    );
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("anoLetivoId", anoLetivoId);
    fd.set("meses", JSON.stringify(mesesSelecionados));
    // Converte R$ para centavos
    const valorReais = parseFloat(String(fd.get("valorReais")).replace(",", "."));
    fd.set("valorCents", String(Math.round(valorReais * 100)));
    fd.delete("valorReais");

    startTransition(async () => {
      const r = await createPlanoCobrancaAction(fd);
      if ("error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      toast({ title: "Plano criado" });
      setOpen(false);
      setMesesSelecionados([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Novo plano de cobrança
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-navy-100 bg-white p-4 space-y-4">
      <p className="text-sm font-semibold text-navy-900">Novo plano de cobrança</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="pf-nome" className="text-xs">Nome do plano</Label>
          <Input id="pf-nome" name="nome" placeholder="Mensalidade 2026" required maxLength={120} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="pf-valor" className="text-xs">Valor (R$)</Label>
          <Input id="pf-valor" name="valorReais" type="number" min="0.01" step="0.01" placeholder="850,00" required />
        </div>

        <div className="space-y-1">
          <Label htmlFor="pf-dia" className="text-xs">Dia de vencimento</Label>
          <Input id="pf-dia" name="vencimentoDia" type="number" min={1} max={28} defaultValue={10} required />
        </div>

        {turmas.length > 0 && (
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="pf-turma" className="text-xs">
              Turma específica <span className="text-navy-400">(deixe em branco para aplicar a todas)</span>
            </Label>
            <select id="pf-turma" name="turmaId" className="w-full rounded-md border border-navy-200 px-3 py-2 text-sm">
              <option value="">Todas as turmas</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>{t.code}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Meses de cobrança</Label>
        <div className="flex flex-wrap gap-1.5">
          {MESES_LIST.map((mes) => (
            <button
              key={mes}
              type="button"
              onClick={() => toggleMes(mes)}
              className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                mesesSelecionados.includes(mes)
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-white text-navy-600 border-navy-200 hover:border-teal-400"
              }`}
            >
              {MESES_LABELS[mes]?.slice(0, 3)}
            </button>
          ))}
        </div>
        <p className="text-xs text-navy-400">{mesesSelecionados.length} mese{mesesSelecionados.length !== 1 ? "s" : ""} selecionado{mesesSelecionados.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending || mesesSelecionados.length === 0}>Criar plano</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
