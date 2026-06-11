import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@nexora/ui";
import { prisma } from "@nexora/db";
import { getAnosLetivos, getAnoLetivoAtivo, getTurmasByAnoLetivo } from "@nexora/db/src/queries/secretaria";
import { BoletimGenerator } from "@/components/secretaria/boletim-generator";

export const metadata: Metadata = { title: "Boletins" };

export default async function BoletinsPage({
  searchParams,
}: {
  searchParams: Promise<{ turmaId?: string; anoLetivoId?: string }>;
}) {
  const { turmaId, anoLetivoId } = await searchParams;
  const session = await auth();
  if (!session) redirect("/login");
  const tenantId = session.user.activeTenantId;

  const [anos, ativo] = await Promise.all([getAnosLetivos(tenantId), getAnoLetivoAtivo(tenantId)]);
  const activeAnoId = anoLetivoId ?? ativo?.id ?? anos[0]?.id;
  const turmas = activeAnoId ? await getTurmasByAnoLetivo(tenantId, activeAnoId) : [];

  const selectedTurma = turmaId
    ? await prisma.turma.findFirst({
        where: { id: turmaId, tenantId },
        include: {
          enrollments: {
            where: { status: "ATIVA" },
            include: { student: { select: { name: true } } },
            orderBy: { student: { name: "asc" } },
          },
        },
      })
    : null;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={"/admin/secretaria" as never}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-navy-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-500" />
            Boletins
          </h1>
          <p className="text-xs text-navy-400">Gere boletins por turma ou aluno em PDF, HTML ou Word.</p>
        </div>
      </div>

      {/* Seletor de turma */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-navy-500">Turma</label>
        <div className="flex flex-wrap gap-2">
          {turmas.length === 0 && <p className="text-sm text-navy-400">Nenhuma turma neste ano letivo.</p>}
          {turmas.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={t.id === turmaId ? "default" : "outline"}
              asChild
            >
              <Link href={`/admin/secretaria/boletins?turmaId=${t.id}` as never} className="font-mono">
                {t.code}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {selectedTurma && (
        <BoletimGenerator
          turmaId={selectedTurma.id}
          turmaCode={selectedTurma.code}
          students={selectedTurma.enrollments.map((e) => ({ enrollmentId: e.id, name: e.student.name }))}
        />
      )}
    </div>
  );
}
