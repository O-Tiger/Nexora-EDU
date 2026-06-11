"use client";

import { useState, useTransition } from "react";
import { Button, Input, Label, toast } from "@nexora/ui";
import { Plus } from "lucide-react";
import { createUnidadeAction } from "@/actions/secretaria";

const GENDER_OPTIONS = [
  { value: "MISTO", label: "Misto" },
  { value: "MASCULINO", label: "Masculino" },
  { value: "FEMININO", label: "Feminino" },
];

export function UnidadeForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createUnidadeAction(fd);
      if ("error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      toast({ title: "Unidade criada" });
      setOpen(false);
      (e.target as HTMLFormElement).reset();
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nova unidade
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-navy-100 bg-white p-4 space-y-3">
      <p className="text-sm font-semibold text-navy-900">Nova unidade</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="u-name" className="text-xs">Nome</Label>
          <Input id="u-name" name="name" placeholder="Colinas" required maxLength={80} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="u-code" className="text-xs">Código <span className="text-navy-400">(usado no código da turma)</span></Label>
          <Input id="u-code" name="code" placeholder="COL" maxLength={10}
            onInput={(e) => { (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase(); }} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Público</Label>
        <div className="flex gap-3">
          {GENDER_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" name="gender" value={o.value} defaultChecked={o.value === "MISTO"} />
              {o.label}
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>Criar</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
