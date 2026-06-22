import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { UserCheck } from "lucide-react";
import { getFilhosFromSession } from "@/lib/responsavel";
import { prisma } from "@nexora/db";
import { getFaltasFromDiario } from "@nexora/db/src/queries/diario";

export const metadata: Metadata = { title: "Frequência" };

export default async function ResponsavelFrequenciaPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const filhos = await getFilhosFromSession(session.user.id, session.user.activeTenantId);
  const filho = filhos[0];
  if (!filho?.turmaId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-navy-900 flex items-center gap-2"><UserCheck className="h-5 w-5 text-teal-500" /> Frequência</h1>
        <p className="text-sm text-navy-500">Aluno sem turma ativa.</p>
      </div>
    );
  }

  const tenantId = session.user.activeTenantId;

  const enrollment = await prisma.turmaEnrollment.findFirst({
    where: { tenantId, studentId: filho.studentId, turmaId: filho.turmaId, status: "ATIVA" },
    select: { id: true },
  });
  if (!enrollment) redirect("/responsavel" as never);

  // Disciplinas da turma
  const turmaDisciplinas = await prisma.turmaDisciplina.findMany({
    where: { tenantId, turmaId: filho.turmaId },
    include: { disciplina: { select: { id: true, name: true } } },
    orderBy: { disciplina: { position: "asc" } },
  });

  // Faltas do diário (por disciplina) para este aluno
  const faltasDiario = await getFaltasFromDiario(tenantId, filho.turmaId);

  // Faltas manuais (fallback)
  const attendances = await prisma.attendance.findMany({
    where: { tenantId, enrollmentId: enrollment.id },
  });

  const rows = turmaDisciplinas.map((td) => {
    const faltaDiario = faltasDiario.get(`${enrollment.id}|${td.disciplinaId}`);
    const faltaManual = attendances.find((a) => a.disciplinaId === td.disciplinaId)?.absences ?? 0;
    const faltas = faltaDiario !== undefined ? faltaDiario : faltaManual;
    return { name: td.disciplina.name, faltas };
  });

  const totalFaltas = rows.reduce((s, r) => s + r.faltas, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy-900 flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-teal-500" /> Frequência
        </h1>
        <p className="text-sm text-navy-500">
          {filho.studentName} · Turma {filho.turmaCode} · {filho.anoLetivoYear}
        </p>
      </div>

      <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center justify-between px-4 py-3">
            <p className="text-sm text-navy-800">{row.name}</p>
            <span className={`text-sm font-semibold ${row.faltas > 0 ? "text-red-600" : "text-teal-600"}`}>
              {row.faltas === 0 ? "Sem faltas" : `${row.faltas} falta${row.faltas !== 1 ? "s" : ""}`}
            </span>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="px-4 py-6 text-sm text-navy-400 text-center">Nenhuma disciplina registrada.</p>
        )}
      </div>

      {totalFaltas > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">
            Total acumulado: {totalFaltas} falta{totalFaltas !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            O limite de faltas é definido pela grade curricular de cada disciplina.
          </p>
        </div>
      )}
    </div>
  );
}
