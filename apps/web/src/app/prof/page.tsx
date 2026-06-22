import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Users, CalendarDays, BookMarked, ChevronRight } from "lucide-react";
import { getProfessorByUserId, getMinhasTurmas } from "@nexora/db/src/queries/professores";

export const metadata: Metadata = { title: "Painel do Professor" };

export default async function ProfDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { id: userId, activeTenantId, name } = session.user;
  const professor = await getProfessorByUserId(userId, activeTenantId);
  if (!professor) redirect("/unauthorized");

  const turmas = await getMinhasTurmas(professor.id, activeTenantId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Olá, {name.split(" ")[0]}</h1>
        <p className="text-sm text-navy-500 mt-1">
          {turmas.length === 0
            ? "Nenhuma turma atribuída no ano letivo ativo."
            : `${turmas.length} turma${turmas.length !== 1 ? "s" : ""} no ano letivo ativo`}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-navy-100 bg-white p-4 flex items-center gap-3">
          <div className="rounded-full p-2 bg-teal-50">
            <Users className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-navy-900">{turmas.length}</p>
            <p className="text-xs text-navy-500">Turmas</p>
          </div>
        </div>
        <div className="rounded-lg border border-navy-100 bg-white p-4 flex items-center gap-3">
          <div className="rounded-full p-2 bg-violet-50">
            <BookMarked className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-navy-900">
              {new Set(turmas.flatMap((t) => t.disciplinas.map((d) => d.id))).size}
            </p>
            <p className="text-xs text-navy-500">Disciplinas</p>
          </div>
        </div>
        <div className="rounded-lg border border-navy-100 bg-white p-4 flex items-center gap-3">
          <div className="rounded-full p-2 bg-amber-50">
            <CalendarDays className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-navy-900">
              {turmas.reduce((acc, t) => acc + t.turma.alunosAtivos, 0)}
            </p>
            <p className="text-xs text-navy-500">Alunos ativos</p>
          </div>
        </div>
      </div>

      {/* Turmas list */}
      {turmas.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy-900">Minhas turmas</h2>
            <Link href={"/prof/turmas" as never} className="text-sm text-teal-600 hover:underline flex items-center gap-1">
              Ver todas <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
            {turmas.map(({ turma, disciplinas }) => (
              <Link
                key={turma.id}
                href={`/prof/turmas/${turma.id}` as never}
                className="flex items-center justify-between px-4 py-3 hover:bg-navy-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-navy-900">{turma.code}</p>
                  <p className="text-xs text-navy-500">
                    {turma.unidadeName} · {turma.alunosAtivos} aluno{turma.alunosAtivos !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-wrap justify-end">
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
                  <ChevronRight className="h-4 w-4 text-navy-300 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
