"use client";

import { useState, useTransition } from "react";
import { Button, Label, toast } from "@nexora/ui";
import { UserPlus } from "lucide-react";
import { enrollStudentAction } from "@/actions/secretaria";

interface Candidate { id: string; name: string; email: string }

interface Props {
  turmaId: string;
  anoLetivoId: string;
  candidates: Candidate[];
}

export function EnrollStudentForm({ turmaId, anoLetivoId, candidates }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = candidates.filter(
    (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.email.toLowerCase().includes(query.toLowerCase()),
  );

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const fd = new FormData();
    fd.set("studentId", selected);
    fd.set("turmaId", turmaId);
    fd.set("anoLetivoId", anoLetivoId);
    startTransition(async () => {
      const r = await enrollStudentAction(fd);
      if ("error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      toast({ title: "Aluno matriculado" });
      setOpen(false);
      setSelected("");
      setQuery("");
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)} disabled={candidates.length === 0}>
        <UserPlus className="h-4 w-4" />
        {candidates.length === 0 ? "Todos os alunos já matriculados" : "Matricular aluno"}
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-navy-100 bg-white p-4 space-y-3">
      <p className="text-sm font-semibold text-navy-900">Matricular aluno</p>
      <div className="space-y-1">
        <Label htmlFor="student-search" className="text-xs">Buscar aluno</Label>
        <input
          id="student-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome ou email..."
          className="w-full rounded-md border border-navy-200 px-3 py-1.5 text-sm"
        />
      </div>
      <div className="max-h-48 overflow-y-auto rounded-md border border-navy-100 divide-y divide-navy-50">
        {filtered.slice(0, 50).map((c) => (
          <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-navy-50 cursor-pointer">
            <input
              type="radio"
              name="studentId"
              value={c.id}
              checked={selected === c.id}
              onChange={() => setSelected(c.id)}
              className="shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-navy-900 truncate">{c.name}</p>
              <p className="text-xs text-navy-400 truncate">{c.email}</p>
            </div>
          </label>
        ))}
        {filtered.length === 0 && (
          <p className="px-3 py-4 text-sm text-navy-400 text-center">Nenhum aluno encontrado.</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending || !selected}>Matricular</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
