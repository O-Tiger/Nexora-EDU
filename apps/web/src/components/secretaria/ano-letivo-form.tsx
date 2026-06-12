"use client";

import { useState, useTransition } from "react";
import { Button, Input, Label, toast } from "@nexora/ui";
import { Plus } from "lucide-react";
import { createAnoLetivoAction } from "@/actions/secretaria";

/** Formata dígitos em dd/mm/aaaa enquanto digita. */
function maskDate(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  const parts = [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean);
  return parts.join("/");
}

/** dd/mm/aaaa → aaaa-mm-dd (ISO) ou null se inválido. */
function toISO(br: string): string | null {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = Number(dd), month = Number(mm), year = Number(yyyy);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(year, month - 1, day);
  if (dt.getDate() !== day || dt.getMonth() !== month - 1) return null; // data real
  return `${yyyy}-${mm}-${dd}`;
}

export function AnoLetivoForm() {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const startISO = toISO(start);
    const endISO = toISO(end);
    if (!startISO || !endISO) {
      toast({ variant: "destructive", title: "Data inválida", description: "Use o formato dd/mm/aaaa." });
      return;
    }
    const fd = new FormData();
    fd.set("year", year);
    fd.set("startDate", startISO);
    fd.set("endDate", endISO);
    startTransition(async () => {
      const r = await createAnoLetivoAction(fd);
      if ("error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      toast({ title: "Ano letivo criado" });
      setOpen(false);
      setYear(""); setStart(""); setEnd("");
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
          <Input id="year" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2026" inputMode="numeric" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="startDate" className="text-xs">Início</Label>
          <Input id="startDate" value={start} onChange={(e) => setStart(maskDate(e.target.value))} placeholder="dd/mm/aaaa" inputMode="numeric" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="endDate" className="text-xs">Fim</Label>
          <Input id="endDate" value={end} onChange={(e) => setEnd(maskDate(e.target.value))} placeholder="dd/mm/aaaa" inputMode="numeric" required />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>Criar</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
