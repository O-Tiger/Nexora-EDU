"use client";

import { useState, useTransition } from "react";
import { toast } from "@nexora/ui";
import { UserCog } from "lucide-react";
import { setTurmaDisciplinaProfessorAction } from "@/actions/pedagogico";

interface DiscItem { disciplinaId: string; disciplinaName: string; professorId: string | null }
interface Professor { id: string; name: string }

interface Props {
  turmaId: string;
  disciplinas: DiscItem[];
  professores: Professor[];
}

export function ProfessorAssign({ turmaId, disciplinas, professores }: Props) {
  const [map, setMap] = useState<Map<string, string>>(
    () => new Map(disciplinas.map((d) => [d.disciplinaId, d.professorId ?? ""])),
  );
  const [isPending, startTransition] = useTransition();

  function change(disciplinaId: string, professorId: string) {
    setMap((prev) => new Map(prev).set(disciplinaId, professorId));
    startTransition(async () => {
      await setTurmaDisciplinaProfessorAction(turmaId, disciplinaId, professorId || null);
      toast({ title: "Professor atualizado" });
    });
  }

  if (disciplinas.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-navy-600 uppercase tracking-wide flex items-center gap-2">
        <UserCog className="h-4 w-4" /> Professores por disciplina
      </h2>
      {professores.length === 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nenhum usuário com papel PROFESSOR neste tenant. Cadastre professores em Alunos/Usuários.
        </p>
      )}
      <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
        {disciplinas.map((d) => (
          <div key={d.disciplinaId} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-sm text-navy-800">{d.disciplinaName}</span>
            <select
              value={map.get(d.disciplinaId) ?? ""}
              onChange={(e) => change(d.disciplinaId, e.target.value)}
              disabled={isPending}
              className="rounded-md border border-navy-200 px-3 py-1.5 text-sm min-w-48"
              aria-label={`Professor de ${d.disciplinaName}`}
            >
              <option value="">— sem professor —</option>
              {professores.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}
