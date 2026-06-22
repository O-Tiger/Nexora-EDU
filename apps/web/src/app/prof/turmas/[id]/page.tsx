import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@nexora/ui";
import { getProfessorByUserId } from "@nexora/db/src/queries/professores";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={"/prof/turmas" as never}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-navy-900">{turma.code}</h1>
          <p className="text-sm text-navy-500">
            {turma.unidade.name} · Ano {turma.anoLetivo.year}
          </p>
        </div>
      </div>

      {/* Alunos */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-navy-500" />
          <h2 className="text-base font-semibold text-navy-900">
            Alunos ({turma.enrollments.length})
          </h2>
        </div>

        {turma.enrollments.length === 0 ? (
          <div className="rounded-lg border border-navy-100 bg-white p-8 text-center">
            <p className="text-sm text-navy-400">Nenhum aluno matriculado nesta turma.</p>
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
                  {e.student.email && (
                    <p className="text-xs text-navy-400 truncate">{e.student.email}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
