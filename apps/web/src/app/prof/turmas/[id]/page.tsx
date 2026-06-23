import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Users, ClipboardList, BookText, ChevronRight } from "lucide-react";
import { Button } from "@nexora/ui";
import { getProfessorByUserId, getMinhasTurmas } from "@nexora/db/src/queries/professores";
import { getTurmaById } from "@nexora/db/src/queries/secretaria";

export const metadata: Metadata = { title: "Turma" };

export default async function ProfTurmaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id: userId, activeTenantId } = session.user;
  const { id: turmaId } = await params;

  const [professor, turma] = await Promise.all([
    getProfessorByUserId(userId, activeTenantId),
    getTurmaById(activeTenantId, turmaId),
  ]);

  if (!professor) redirect("/unauthorized");
  if (!turma) notFound();

  // Verify this professor actually teaches in this turma
  const minhasTurmas = await getMinhasTurmas(professor.id, activeTenantId);
  const minhaTurma = minhasTurmas.find((t) => t.turma.id === turmaId);
  if (!minhaTurma) redirect("/unauthorized");

  const actions = [
    {
      href: `/prof/turmas/${turmaId}/notas`,
      label: "Lançar notas",
      description: "Notas e frequências por disciplina",
      icon: ClipboardList,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
    {
      href: `/prof/turmas/${turmaId}/diario`,
      label: "Diário de classe",
      description: "Registrar aulas e presenças",
      icon: BookText,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={"/prof/turmas" as never}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-navy-900">{turma.code}</h1>
          <p className="text-sm text-navy-500">
            {turma.unidade.name} · Ano {turma.anoLetivo.year} · {turma.enrollments.length} aluno{turma.enrollments.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* My disciplines */}
      <div className="flex gap-1 flex-wrap">
        {minhaTurma.disciplinas.map((d) => (
          <span key={d.id} className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: (d.color ?? "#6b7280") + "22", color: d.color ?? "#6b7280" }}>
            {d.name}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {actions.map(({ href, label, description, icon: Icon, color, bg }) => (
          <Link key={href} href={href as never}
            className="flex items-center gap-4 rounded-lg border border-navy-100 bg-white p-4 hover:bg-navy-50 transition-colors">
            <div className={`rounded-full p-2.5 ${bg} shrink-0`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-navy-900">{label}</p>
              <p className="text-xs text-navy-500">{description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-navy-300 shrink-0" />
          </Link>
        ))}
      </div>

      {/* Students */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-navy-500" />
          <h2 className="text-base font-semibold text-navy-900">Alunos ({turma.enrollments.length})</h2>
        </div>
        {turma.enrollments.length === 0 ? (
          <div className="rounded-lg border border-navy-100 bg-white p-8 text-center">
            <p className="text-sm text-navy-400">Nenhum aluno matriculado.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
            {turma.enrollments.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-100 text-xs font-semibold text-navy-600 shrink-0">
                  {e.student.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy-900 truncate">{e.student.name}</p>
                  {e.student.email && <p className="text-xs text-navy-400 truncate">{e.student.email}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
