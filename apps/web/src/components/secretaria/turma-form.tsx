"use client";

import { useState, useTransition } from "react";
import { Button, Input, Label, toast } from "@nexora/ui";
import { Plus } from "lucide-react";
import { createTurmaAction } from "@/actions/secretaria";
import { EtapaValues, ETAPA_LABELS, ETAPA_ANO_RANGE } from "@nexora/validators";

interface Props {
  unidadeId: string;
  unidadeCode: string;
  anoLetivoId: string;
}

const PERIODO_OPTIONS = [
  { value: "MANHA", label: "Manhã" },
  { value: "TARDE", label: "Tarde" },
  { value: "NOITE", label: "Noite" },
  { value: "INTEGRAL", label: "Integral" },
];

export function TurmaForm({ unidadeId, unidadeCode, anoLetivoId }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [etapa, setEtapa] = useState<string>("EF1");
  const [ano, setAno] = useState<string>("1");
  const [letra, setLetra] = useState("A");
  const [etapaPrefix, setEtapaPrefix] = useState("EF");

  const range = ETAPA_ANO_RANGE[etapa as keyof typeof ETAPA_ANO_RANGE];
  const preview = `${etapaPrefix}${ano}${letra.toUpperCase()}${unidadeCode}`;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("unidadeId", unidadeId);
    fd.set("anoLetivoId", anoLetivoId);
    startTransition(async () => {
      const r = await createTurmaAction(fd);
      if ("error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      toast({ title: `Turma ${r.code} criada` });
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nova turma
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-navy-100 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-navy-900">Nova turma</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-navy-500">Código gerado:</span>
          <span className="font-mono text-sm font-bold text-teal-700">{preview}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Etapa</Label>
          <select
            name="etapa"
            value={etapa}
            onChange={(e) => setEtapa(e.target.value)}
            className="w-full rounded-md border border-navy-200 px-3 py-1.5 text-sm"
            required
          >
            {EtapaValues.map((e) => (
              <option key={e} value={e}>{ETAPA_LABELS[e]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="t-ano" className="text-xs">Ano / Série</Label>
          <Input
            id="t-ano"
            name="ano"
            type="number"
            min={range?.min ?? 1}
            max={range?.max ?? 9}
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="t-letra" className="text-xs">Turma</Label>
          <Input
            id="t-letra"
            name="letra"
            maxLength={3}
            value={letra}
            onChange={(e) => setLetra(e.target.value.toUpperCase())}
            placeholder="A"
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Período</Label>
          <select name="periodo" className="w-full rounded-md border border-navy-200 px-3 py-1.5 text-sm" required>
            {PERIODO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="t-prefix" className="text-xs">
            Prefixo da etapa <span className="text-navy-400">(configurável por escola)</span>
          </Label>
          <Input
            id="t-prefix"
            name="etapaPrefix"
            value={etapaPrefix}
            onChange={(e) => setEtapaPrefix(e.target.value.toUpperCase())}
            placeholder="EF"
            maxLength={20}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="t-max" className="text-xs">Máx. alunos</Label>
          <Input id="t-max" name="maxStudents" type="number" min={1} max={100} defaultValue={35} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>Criar turma</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
