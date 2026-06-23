import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Download } from "lucide-react";
import { getFilhosFromSession, pickFilho } from "@/lib/responsavel";
import { getBoletimData } from "@nexora/db/src/queries/pedagogico";
import { prisma } from "@nexora/db";

export const metadata: Metadata = { title: "Boletim" };

export default async function ResponsavelBoletimPage({
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
        <h1 className="text-xl font-bold text-navy-900 flex items-center gap-2"><FileText className="h-5 w-5 text-teal-500" /> Boletim</h1>
        <p className="text-sm text-navy-500">Aluno sem turma ativa neste ano letivo.</p>
      </div>
    );
  }

  const enrollment = await prisma.turmaEnrollment.findFirst({
    where: { tenantId: session.user.activeTenantId, studentId: filho.studentId, turmaId: filho.turmaId, status: "ATIVA" },
    select: { id: true },
  });

  const boletim = await getBoletimData(session.user.activeTenantId, filho.turmaId, enrollment?.id);

  if (!boletim || boletim.students.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-navy-900 flex items-center gap-2"><FileText className="h-5 w-5 text-teal-500" /> Boletim</h1>
        <p className="text-sm text-navy-500">Notas ainda não lançadas para este período.</p>
      </div>
    );
  }

  const aluno = boletim.students[0]!;
  const periods = [1, 2, 3];
  const kinds = ["AVA", "RECP"] as const;

  const pdfUrl = `/api/responsavel/boletim?turmaId=${filho.turmaId}${enrollment ? `&enrollmentId=${enrollment.id}` : ""}&format=pdf`;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-navy-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-500" /> Boletim
          </h1>
          <p className="text-sm text-navy-500">
            {filho.studentName} · Turma {boletim.turma.code} · {boletim.turma.year}
          </p>
        </div>
        <Link
          href={pdfUrl as never}
          target="_blank"
          className="inline-flex items-center gap-2 rounded-md border border-navy-200 bg-white px-3 py-1.5 text-sm text-navy-700 hover:bg-navy-50 transition-colors"
        >
          <Download className="h-4 w-4" /> Baixar PDF
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-navy-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 border-b border-navy-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-navy-600">Disciplina</th>
              {periods.map((p) => (
                kinds.map((k) => (
                  <th key={`${p}-${k}`} className="px-3 py-2 text-center text-xs font-semibold text-navy-600">
                    {k === "AVA" ? `T${p}` : `Rec ${p}`}
                  </th>
                ))
              ))}
              <th className="px-3 py-2 text-center text-xs font-semibold text-navy-600">Final</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-navy-600">Faltas</th>
            </tr>
          </thead>
          <tbody>
            {aluno.rows.map((row) => (
              <tr key={row.disciplinaId} className={`border-b border-navy-50 ${row.isFrente ? "bg-navy-50/30" : ""}`}>
                <td className={`px-4 py-2 text-navy-800 ${row.isFrente ? "pl-8 text-navy-500 text-xs" : "font-medium"}`}>
                  {row.name}
                </td>
                {periods.map((p) => (
                  kinds.map((k) => {
                    const score = row.grades[`p${p}-${k}`] ?? null;
                    return (
                      <td key={`${p}-${k}`} className="px-3 py-2 text-center">
                        {score !== null ? (
                          <span className={score < 6 ? "text-red-600 font-semibold" : "text-navy-800"}>
                            {score.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-navy-300">—</span>
                        )}
                      </td>
                    );
                  })
                ))}
                <td className="px-3 py-2 text-center">
                  {row.grades["p0-FINAL"] != null ? (
                    <span className={row.grades["p0-FINAL"]! < 5 ? "text-red-600 font-semibold" : "text-navy-800"}>
                      {row.grades["p0-FINAL"]!.toFixed(1)}
                    </span>
                  ) : <span className="text-navy-300">—</span>}
                </td>
                <td className="px-3 py-2 text-center text-navy-600">{row.absences}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {aluno.totalAbsences > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">
            Total de faltas: {aluno.totalAbsences}
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            O limite de faltas é definido pela grade curricular de cada disciplina.
          </p>
        </div>
      )}
    </div>
  );
}
