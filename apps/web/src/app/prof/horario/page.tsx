import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { getProfessorByUserId, getMeuHorario } from "@nexora/db/src/queries/professores";

export const metadata: Metadata = { title: "Meu Horário" };

const DIAS = ["", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default async function ProfHorarioPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { id: userId, activeTenantId } = session.user;
  const professor = await getProfessorByUserId(userId, activeTenantId);
  if (!professor) redirect("/unauthorized");

  const horarios = await getMeuHorario(professor.id, activeTenantId);

  // Build a map: diaSemana → ordem → slot
  type Slot = { turmaCode: string; disciplinaName: string; color: string };
  const grade = new Map<number, Map<number, Slot>>();
  const maxOrdem = horarios.reduce((m, h) => Math.max(m, h.ordem), 0);
  const diasComAulas = [...new Set(horarios.map((h) => h.diaSemana))].sort();

  for (const h of horarios) {
    if (!grade.has(h.diaSemana)) grade.set(h.diaSemana, new Map());
    grade.get(h.diaSemana)!.set(h.ordem, {
      turmaCode: h.turma.code,
      disciplinaName: h.disciplina.name,
      color: h.disciplina.color ?? "#6b7280",
    });
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
                  <th key={d} className="px-3 py-2 text-center text-xs font-semibold text-navy-700">
                    {DIAS[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {ordens.map((ordem) => (
                <tr key={ordem}>
                  <td className="px-3 py-2 text-xs font-medium text-navy-400 text-center">{ordem}ª</td>
                  {diasComAulas.map((dia) => {
                    const slot = grade.get(dia)?.get(ordem);
                    return (
                      <td key={dia} className="px-2 py-1.5 text-center">
                        {slot ? (
                          <div
                            className="rounded-md px-2 py-1 inline-block text-xs font-medium"
                            style={{ backgroundColor: slot.color + "22", color: slot.color }}
                          >
                            <div>{slot.disciplinaName}</div>
                            <div className="font-normal opacity-75">{slot.turmaCode}</div>
                          </div>
                        ) : (
                          <span className="text-navy-200">—</span>
                        )}
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
