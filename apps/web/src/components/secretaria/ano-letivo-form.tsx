"use client";

import { useState, useTransition } from "react";
import { Button, Input, Label, toast } from "@nexora/ui";
import { Plus } from "lucide-react";
import { createAnoLetivoAction } from "@/actions/secretaria";

export function AnoLetivoForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createAnoLetivoAction(fd);
      if ("error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      toast({ title: "Ano letivo criado" });
      setOpen(false);
      (e.target as HTMLFormElement).reset();
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Novo ano letivo
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-navy-100 bg-white p-4 space-y-3">
      <p className="text-sm font-semibold text-navy-900">Novo ano letivo</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="year" className="text-xs">Ano</Label>
          <Input id="year" name="year" type="number" placeholder="2026" min={2000} max={2100} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="startDate" className="text-xs">Início</Label>
          <Input id="startDate" name="startDate" type="date" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="endDate" className="text-xs">Fim</Label>
          <Input id="endDate" name="endDate" type="date" required />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>Criar</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
