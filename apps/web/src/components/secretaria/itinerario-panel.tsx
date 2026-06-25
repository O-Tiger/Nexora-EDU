"use client";

import { useState, useTransition } from "react";
import { RouteIcon, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@nexora/ui";
import { setEnrollmentFrenteAction } from "@/actions/pedagogico";

interface Student { enrollmentId: string; name: string }
interface FrenteOption { id: string; name: string }
interface ItinerarioParent { id: string; name: string; frentes: FrenteOption[] }
interface EnrollmentFrenteRow { enrollmentId: string; disciplinaId: string; frenteId: string; frenteName: string }

interface Props {
  students: Student[];
  itinerarioParents: ItinerarioParent[];
  enrollmentFrentes: EnrollmentFrenteRow[];
}

export function ItinerarioPanel({ students, itinerarioParents, enrollmentFrentes }: Props) {
  const [open, setOpen] = useState(true);
  const [isPending, startTransition] = useTransition();
  // local state: `${enrollmentId}|${parentId}` → frenteId | ""
  const [assignments, setAssignments] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>();
    for (const r of enrollmentFrentes) m.set(`${r.enrollmentId}|${r.disciplinaId}`, r.frenteId);
    return m;
  });

  function onChange(enrollmentId: string, parentId: string, frenteId: string) {
    const key = `${enrollmentId}|${parentId}`;
    setAssignments((prev) => new Map(prev).set(key, frenteId));
    startTransition(async () => {
      const r = await setEnrollmentFrenteAction(enrollmentId, parentId, frenteId || null);
      if ("error" in r) toast({ variant: "destructive", title: "Erro ao salvar trilha" });
    });
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-amber-800"
      >
        <span className="flex items-center gap-2">
          <RouteIcon className="h-4 w-4" />
          Itinerário Formativo — atribuição de trilhas
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="border-t border-amber-200 p-4 space-y-6">
          {itinerarioParents.map((parent) => (
            <div key={parent.id}>
              <p className="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wide">
                {parent.name}
              </p>
              {parent.frentes.length === 0 ? (
                <p className="text-xs text-amber-600">Nenhuma frente atribuída à turma para esta disciplina.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border border-amber-200 bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-amber-100 bg-amber-50 text-xs text-amber-700">
                        <th className="px-3 py-2 text-left font-semibold">Aluno</th>
                        <th className="px-3 py-2 text-left font-semibold">Trilha escolhida</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-50">
                      {students.map((s) => {
                        const key = `${s.enrollmentId}|${parent.id}`;
                        const current = assignments.get(key) ?? "";
                        return (
                          <tr key={s.enrollmentId}>
                            <td className="px-3 py-1.5 text-navy-800 whitespace-nowrap">{s.name}</td>
                            <td className="px-3 py-1.5">
                              <select
                                value={current}
                                onChange={(e) => onChange(s.enrollmentId, parent.id, e.target.value)}
                                disabled={isPending}
                                className="rounded border border-navy-200 px-2 py-1 text-sm focus-ring w-full max-w-xs"
                                aria-label={`Trilha de ${s.name} em ${parent.name}`}
                              >
                                <option value="">— não atribuída —</option>
                                {parent.frentes.map((f) => (
                                  <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
