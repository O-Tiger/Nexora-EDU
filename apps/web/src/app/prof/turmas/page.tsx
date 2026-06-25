import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { getProfessorByUserId, getMinhasTurmas } from "@nexora/db/src/queries/professores";

export const metadata: Metadata = { title: "Minhas Turmas" };

export default async function ProfTurmasPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { id: userId, activeTenantId } = session.user;
  const professor = await getProfessorByUserId(userId, activeTenantId);
  if (!professor) redirect("/unauthorized");

  const turmas = await getMinhasTurmas(professor.id, activeTenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-teal-600" />
        <h1 className="text-xl font-bold text-navy-900">Minhas Turmas</h1>
      </div>

      {turmas.length === 0 ? (
        <div className="rounded-lg border border-navy-100 bg-white p-12 text-center">
          <Users className="h-10 w-10 text-navy-200 mx-auto mb-3" />
          <p className="font-medium text-navy-700">Nenhuma turma atribuída</p>
          <p className="text-sm text-navy-400 mt-1">Seu administrador ainda não atribuiu turmas para você.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
          {turmas.map(({ turma, disciplinas }) => (
            <Link
              key={turma.id}
              href={`/prof/turmas/${turma.id}` as never}
              className="flex items-center justify-between px-4 py-4 hover:bg-navy-50 transition-colors"
            >
              <div className="space-y-1">
                <p className="font-semibold text-navy-900">{turma.code}</p>
                <p className="text-sm text-navy-500">
                  {turma.unidadeName} · Ano {turma.year} · {turma.alunosAtivos} aluno{turma.alunosAtivos !== 1 ? "s" : ""}
                </p>
                <div className="flex gap-1 flex-wrap">
                  {disciplinas.map((d) => (
                    <span
                      key={d.id}
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: (d.color ?? "#6b7280") + "22", color: d.color ?? "#6b7280" }}
                    >
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-navy-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
