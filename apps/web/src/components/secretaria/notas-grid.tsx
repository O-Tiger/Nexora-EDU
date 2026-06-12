"use client";

import { useState, useTransition, useMemo } from "react";
import { Button, toast } from "@nexora/ui";
import { Settings2, Check } from "lucide-react";
import { saveGradeAction, saveAttendanceAction, setTurmaDisciplinasAction } from "@/actions/pedagogico";
import type { GradeKind } from "@nexora/db";

interface Student { enrollmentId: string; name: string }
interface DiscOption { id: string; name: string; isFrente: boolean }
interface GradeCell { enrollmentId: string; disciplinaId: string; period: number; kind: GradeKind; score: number | null }
interface AttCell { enrollmentId: string; disciplinaId: string; absences: number }

interface Props {
  turmaId: string;
  students: Student[];
  allDisciplinas: DiscOption[];
  assignedIds: string[];
  assignedDisciplinas: { id: string; name: string }[];
  grades: GradeCell[];
  attendances: AttCell[];
}

// Colunas de nota: 1ª/2ª/3ª avaliação (trimestres) + recuperação única + prova final
const COLUMNS: { key: string; label: string; period: number; kind: GradeKind }[] = [
  { key: "1-AVA", label: "1ª AVA", period: 1, kind: "AVA" },
  { key: "2-AVA", label: "2ª AVA", period: 2, kind: "AVA" },
  { key: "3-AVA", label: "3ª AVA", period: 3, kind: "AVA" },
  { key: "0-RECP", label: "REC", period: 0, kind: "RECP" },
  { key: "0-FINAL", label: "Prova Final", period: 0, kind: "FINAL" },
];

export function NotasGrid(props: Props) {
  const { turmaId, students, allDisciplinas, assignedDisciplinas } = props;
  const [assigned, setAssigned] = useState<Set<string>>(new Set(props.assignedIds));
  const [showAssign, setShowAssign] = useState(assignedDisciplinas.length === 0);
  const [selectedDisc, setSelectedDisc] = useState<string>(assignedDisciplinas[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  // Mapa de notas em estado local: key `${enr}|${disc}|${period}-${kind}` → score
  const [grades, setGrades] = useState<Map<string, number | null>>(() => {
    const m = new Map<string, number | null>();
    for (const g of props.grades) m.set(`${g.enrollmentId}|${g.disciplinaId}|${g.period}-${g.kind}`, g.score);
    return m;
  });
  const [absences, setAbsences] = useState<Map<string, number>>(() => {
    const m = new Map<string, number>();
    for (const a of props.attendances) m.set(`${a.enrollmentId}|${a.disciplinaId}`, a.absences);
    return m;
  });

  const assignedList = useMemo(
    () => allDisciplinas.filter((d) => assigned.has(d.id)),
    [allDisciplinas, assigned],
  );

  function toggleAssign(id: string) {
    setAssigned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function saveAssignments() {
    const ids = [...assigned];
    startTransition(async () => {
      await setTurmaDisciplinasAction(turmaId, ids);
      toast({ title: "Disciplinas da turma atualizadas" });
      setShowAssign(false);
      if (!ids.includes(selectedDisc)) setSelectedDisc(ids[0] ?? "");
    });
  }

  function onGradeBlur(enrollmentId: string, period: number, kind: GradeKind, raw: string) {
    if (!selectedDisc) return;
    const key = `${enrollmentId}|${selectedDisc}|${period}-${kind}`;
    const score = raw.trim() === "" ? null : Number(raw.replace(",", "."));
    if (score != null && (isNaN(score) || score < 0 || score > 10)) {
      toast({ variant: "destructive", title: "Nota inválida", description: "Use valores de 0 a 10." });
      return;
    }
    setGrades((prev) => new Map(prev).set(key, score));
    startTransition(async () => {
      await saveGradeAction({ enrollmentId, disciplinaId: selectedDisc, period, kind, score });
    });
  }

  function onAbsenceBlur(enrollmentId: string, raw: string) {
    if (!selectedDisc) return;
    const key = `${enrollmentId}|${selectedDisc}`;
    const absences = raw.trim() === "" ? 0 : Math.floor(Number(raw));
    if (isNaN(absences) || absences < 0) return;
    setAbsences((prev) => new Map(prev).set(key, absences));
    startTransition(async () => {
      await saveAttendanceAction({ enrollmentId, disciplinaId: selectedDisc, absences });
    });
  }

  return (
    <div className="space-y-4">
      {/* Disciplinas da turma */}
      <div className="rounded-lg border border-navy-100 bg-white">
        <button
          onClick={() => setShowAssign((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-navy-800 hover:bg-navy-50"
        >
          <span className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-teal-500" />
            Disciplinas da turma ({assignedList.length})
          </span>
          <span className="text-xs text-teal-600">{showAssign ? "Fechar" : "Configurar"}</span>
        </button>

        {showAssign && (
          <div className="border-t border-navy-100 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 max-h-72 overflow-y-auto">
              {allDisciplinas.map((d) => (
                <label key={d.id} className={`flex items-center gap-2 text-sm cursor-pointer ${d.isFrente ? "pl-4 text-navy-500" : "text-navy-800"}`}>
                  <input type="checkbox" checked={assigned.has(d.id)} onChange={() => toggleAssign(d.id)} />
                  {d.name}
                </label>
              ))}
              {allDisciplinas.length === 0 && (
                <p className="text-sm text-navy-400 col-span-2">
                  Nenhuma disciplina cadastrada. Crie em Disciplinas primeiro.
                </p>
              )}
            </div>
            <Button size="sm" onClick={saveAssignments} disabled={isPending} className="gap-2">
              <Check className="h-4 w-4" /> Salvar disciplinas
            </Button>
          </div>
        )}
      </div>

      {assignedList.length > 0 && (
        <>
          {/* Seletor de disciplina */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-navy-500">Disciplina:</span>
            <select
              value={selectedDisc}
              onChange={(e) => setSelectedDisc(e.target.value)}
              className="rounded-md border border-navy-200 px-3 py-1.5 text-sm"
            >
              {assignedList.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* Grade de notas */}
          {selectedDisc && (
            <div className="overflow-x-auto rounded-lg border border-navy-100 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-100 bg-navy-50 text-xs text-navy-500">
                    <th className="px-3 py-2 text-left font-semibold sticky left-0 bg-navy-50">Aluno</th>
                    {COLUMNS.map((c) => <th key={c.key} className="px-2 py-2 font-semibold w-16">{c.label}</th>)}
                    <th className="px-2 py-2 font-semibold w-16">Faltas</th>
                  </tr>
                </thead>
                <tbody key={selectedDisc} className="divide-y divide-navy-50">
                  {students.map((s) => (
                    <tr key={s.enrollmentId}>
                      <td className="px-3 py-1.5 font-medium text-navy-800 whitespace-nowrap sticky left-0 bg-white">{s.name}</td>
                      {COLUMNS.map((c) => {
                        const val = grades.get(`${s.enrollmentId}|${selectedDisc}|${c.period}-${c.kind}`);
                        return (
                          <td key={c.key} className="px-1 py-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              defaultValue={val != null ? String(val) : ""}
                              onBlur={(e) => onGradeBlur(s.enrollmentId, c.period, c.kind, e.target.value)}
                              className="w-14 rounded border border-navy-200 px-1.5 py-1 text-center text-sm focus-ring"
                              aria-label={`${c.label} de ${s.name}`}
                            />
                          </td>
                        );
                      })}
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          min={0}
                          defaultValue={absences.get(`${s.enrollmentId}|${selectedDisc}`) ?? 0}
                          onBlur={(e) => onAbsenceBlur(s.enrollmentId, e.target.value)}
                          className="w-14 rounded border border-navy-200 px-1.5 py-1 text-center text-sm focus-ring"
                          aria-label={`Faltas de ${s.name}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-navy-400">As notas são salvas automaticamente ao sair do campo. Escala 0–10.</p>
        </>
      )}
    </div>
  );
}
