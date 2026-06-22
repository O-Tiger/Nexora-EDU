"use client";

import { useState, useTransition } from "react";
import { Button, Input, Label, toast } from "@nexora/ui";
import { Plus } from "lucide-react";
import { createGuardianAction } from "@/actions/secretaria";

const RELATIONSHIP_OPTIONS = [
  { value: "PAI", label: "Pai" },
  { value: "MAE", label: "Mãe" },
  { value: "RESPONSIBLE", label: "Responsável" },
  { value: "OUTRO", label: "Outro" },
];

export function GuardianForm({ studentId }: { studentId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("studentId", studentId);
    startTransition(async () => {
      const r = await createGuardianAction(fd);
      if ("error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      toast({ title: "Responsável adicionado" });
      setOpen(false);
      (e.target as HTMLFormElement).reset();
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Adicionar responsável
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-navy-100 bg-white p-4 space-y-3">
      <p className="text-sm font-semibold text-navy-900">Novo responsável</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="g-name" className="text-xs">Nome completo</Label>
          <Input id="g-name" name="name" required maxLength={120} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="g-email" className="text-xs">Email</Label>
          <Input id="g-email" name="email" type="email" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="g-phone" className="text-xs">Telefone</Label>
          <Input id="g-phone" name="phone" type="tel" maxLength={20} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="g-cpf" className="text-xs">CPF</Label>
          <Input id="g-cpf" name="cpf" maxLength={14} placeholder="000.000.000-00" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Parentesco</Label>
          <select name="relationship" className="w-full rounded-md border border-navy-200 px-3 py-1.5 text-sm" required>
            {RELATIONSHIP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" name="isPrimary" value="true" />
        Responsável principal (recebe comunicados)
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>Salvar</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
