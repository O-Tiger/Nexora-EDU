import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { getProfessorByUserId, getMeuHorario } from "@nexora/db/src/queries/professores";

export const metadata: Metadata = { title: "Meu Horário" };

const DIAS: Record<number, string> = { 1: "Segunda", 2: "Terça", 3: "Quarta", 4: "Quinta", 5: "Sexta", 6: "Sábado" };

type SlotEntry = { turmaCode: string; disciplinaName: string; color: string; frequencia: string };

export default async function ProfHorarioPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { id: userId, activeTenantId } = session.user;
  const professor = await getProfessorByUserId(userId, activeTenantId);
  if (!professor) redirect("/unauthorized");

  const horarios = await getMeuHorario(professor.id, activeTenantId);

  // grade: diaSemana → ordem → list of slots (1 for semanal, 2 for biweekly pair)
  const grade = new Map<number, Map<number, SlotEntry[]>>();
  const maxOrdem = horarios.reduce((m, h) => Math.max(m, h.ordem), 0);
  const diasComAulas = [...new Set(horarios.map((h) => h.diaSemana))].sort();

  for (const h of horarios) {
    if (!grade.has(h.diaSemana)) grade.set(h.diaSemana, new Map());
    const diaMap = grade.get(h.diaSemana)!;
    const existing = diaMap.get(h.ordem) ?? [];
    existing.push({
      turmaCode: h.turma.code,
      disciplinaName: h.disciplina.name,
      color: h.disciplina.color ?? "#6b7280",
      frequencia: h.frequencia,
    });
    diaMap.set(h.ordem, existing);
  }

  const ordens = Array.from({ length: maxOrdem }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-teal-600" />
        <h1 className="text-xl font-bold text-navy-900">Meu Horário</h1>
      </div>

      {horarios.length === 0 ? (
        <div className="rounded-lg border border-navy-100 bg-white p-12 text-center">
          <CalendarDays className="h-10 w-10 text-navy-200 mx-auto mb-3" />
          <p className="font-medium text-navy-700">Nenhum horário cadastrado</p>
          <p className="text-sm text-navy-400 mt-1">O horário será exibido assim que o admin configurar a grade das suas turmas.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-navy-100 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-navy-100">
                <th className="px-3 py-2 text-left text-xs font-semibold text-navy-500 w-12">Aula</th>
                {diasComAulas.map((d) => (
                  <th key={d} className="px-3 py-2 text-center text-xs font-semibold text-navy-700">{DIAS[d]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {ordens.map((ordem) => (
                <tr key={ordem}>
                  <td className="px-3 py-2 text-xs font-medium text-navy-400 text-center">{ordem}ª</td>
                  {diasComAulas.map((dia) => {
                    const slots = grade.get(dia)?.get(ordem);
                    if (!slots || slots.length === 0) {
                      return <td key={dia} className="px-2 py-1.5 text-center text-navy-200 text-xs">—</td>;
                    }
                    // Semanal: single pill
                    if (slots.length === 1 && slots[0]!.frequencia === "SEMANAL") {
                      const s = slots[0]!;
                      return (
                        <td key={dia} className="px-2 py-1.5 text-center">
                          <div className="rounded-md px-2 py-1 inline-block text-xs font-medium"
                            style={{ backgroundColor: s.color + "22", color: s.color }}>
                            <div>{s.disciplinaName}</div>
                            <div className="font-normal opacity-75">{s.turmaCode}</div>
                          </div>
                        </td>
                      );
                    }
                    // Biweekly: two stacked pills
                    const par   = slots.find((s) => s.frequencia === "QUINZENAL_PAR");
                    const impar = slots.find((s) => s.frequencia === "QUINZENAL_IMPAR");
                    return (
                      <td key={dia} className="px-1 py-1 align-top">
                        <div className="space-y-1">
                          {[par, impar].map((s, i) => {
                            if (!s) return null;
                            const isPar = s.frequencia === "QUINZENAL_PAR";
                            return (
                              <div key={i} className="rounded-md px-2 py-1 text-xs font-medium"
                                style={{ backgroundColor: s.color + "22", color: s.color }}>
                                <div className={`text-[10px] font-bold mb-0.5 ${isPar ? "text-amber-700" : "text-violet-700"}`}>
                                  {isPar ? "Par" : "Ímpar"}
                                </div>
                                <div>{s.disciplinaName}</div>
                                <div className="font-normal opacity-75">{s.turmaCode}</div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
