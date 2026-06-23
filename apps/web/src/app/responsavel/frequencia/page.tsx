import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { UserCheck } from "lucide-react";
import { getFilhosFromSession, pickFilho } from "@/lib/responsavel";
import { prisma } from "@nexora/db";
import { getFaltasFromDiario } from "@nexora/db/src/queries/diario";

export const metadata: Metadata = { title: "Frequência" };

export default async function ResponsavelFrequenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const [filhos, sp] = await Promise.all([
    getFilhosFromSession(session.user.id, session.user.activeTenantId),
    searchParams,
  ]);
  const filho = pickFilho(filhos, sp.studentId);

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

  const [turmaDisciplinas, faltasDiario, attendances, totalAulasPorDisc] = await Promise.all([
    prisma.turmaDisciplina.findMany({
      where: { tenantId, turmaId: filho.turmaId },
      include: { disciplina: { select: { id: true, name: true } } },
      orderBy: { disciplina: { position: "asc" } },
    }),
    getFaltasFromDiario(tenantId, filho.turmaId),
    prisma.attendance.findMany({ where: { tenantId, enrollmentId: enrollment.id } }),
    prisma.registroAula.groupBy({
      by: ["disciplinaId"],
      where: { tenantId, turmaId: filho.turmaId },
      _sum: { quantidadeAulas: true },
    }),
  ]);

  const totalAulasMap = new Map(
    totalAulasPorDisc.map((r) => [r.disciplinaId, r._sum.quantidadeAulas ?? 0]),
  );

  const rows = turmaDisciplinas.map((td) => {
    const faltaDiario = faltasDiario.get(`${enrollment.id}|${td.disciplinaId}`);
    const faltaManual = attendances.find((a) => a.disciplinaId === td.disciplinaId)?.absences ?? 0;
    const faltas = faltaDiario !== undefined ? faltaDiario : faltaManual;
    const totalAulas = totalAulasMap.get(td.disciplinaId) ?? 0;
    const pct = totalAulas > 0 ? faltas / totalAulas : null;
    return { id: td.disciplinaId, name: td.disciplina.name, faltas, totalAulas, pct };
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
        {rows.map((row) => {
          const over25 = row.pct !== null && row.pct > 0.25;
          return (
            <div key={row.id} className="px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-navy-800">{row.name}</p>
                <span className={`text-sm font-semibold shrink-0 ${over25 ? "text-red-600" : row.faltas > 0 ? "text-amber-600" : "text-teal-600"}`}>
                  {row.faltas === 0 ? "Sem faltas" : `${row.faltas} falta${row.faltas !== 1 ? "s" : ""}`}
                  {row.totalAulas > 0 && <span className="font-normal text-xs text-navy-400"> / {row.totalAulas} aulas</span>}
                </span>
              </div>
              {row.totalAulas > 0 && (
                <div className="h-1.5 rounded-full bg-navy-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${over25 ? "bg-red-500" : row.faltas > 0 ? "bg-amber-400" : "bg-teal-400"}`}
                    style={{ width: `${Math.min(100, (row.faltas / row.totalAulas) * 100).toFixed(1)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="px-4 py-6 text-sm text-navy-400 text-center">Nenhuma disciplina registrada.</p>
        )}
      </div>

      {totalFaltas > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">
            Total acumulado: {totalFaltas} falta{totalFaltas !== 1 ? "s" : ""}
          </p>
          {rows.some((r) => r.pct !== null && r.pct > 0.25) && (
            <p className="text-xs text-red-700 mt-0.5 font-medium">
              Atenção: uma ou mais disciplinas ultrapassaram 25% de faltas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
