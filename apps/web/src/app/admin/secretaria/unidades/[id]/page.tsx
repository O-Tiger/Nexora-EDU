import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { Button, Badge } from "@nexora/ui";
import { prisma } from "@nexora/db";
import { getTurmasByUnidade } from "@nexora/db/src/queries/secretaria";
import { ETAPA_LABELS, type Etapa } from "@nexora/validators";
import { TurmaForm } from "@/components/secretaria/turma-form";

export const metadata: Metadata = { title: "Unidade — Turmas" };

const PERIODO_LABELS: Record<string, string> = {
  MANHA: "Manhã", TARDE: "Tarde", NOITE: "Noite", INTEGRAL: "Integral",
};

export default async function UnidadeTurmasPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ anoLetivoId?: string }>;
}) {
  const { id: unidadeId } = await params;
  const { anoLetivoId } = await searchParams;

  const session = await auth();
  if (!session) redirect("/login");
  const tenantId = session.user.activeTenantId;

  const [unidade, anosLetivos] = await Promise.all([
    prisma.unidade.findFirst({ where: { id: unidadeId, tenantId } }),
    prisma.anoLetivo.findMany({ where: { tenantId }, orderBy: { year: "desc" } }),
  ]);
  if (!unidade) notFound();

  const activeAnoId = anoLetivoId ?? anosLetivos.find((a) => a.status === "EM_ANDAMENTO")?.id ?? anosLetivos[0]?.id;
  const activeAno = anosLetivos.find((a) => a.id === activeAnoId);

  const turmas = activeAnoId
    ? await getTurmasByUnidade(tenantId, unidadeId, activeAnoId)
    : [];

  // Group by etapa
  const byEtapa = turmas.reduce<Record<string, typeof turmas>>((acc, t) => {
    (acc[t.etapa] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={"/admin/secretaria" as never}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-navy-900">{unidade.name}</h1>
          <p className="text-xs text-navy-400">
            Código: <span className="font-mono">{unidade.code || "—"}</span> ·{" "}
            {{MASCULINO: "Masculino", FEMININO: "Feminino", MISTO: "Misto"}[unidade.gender]}
          </p>
        </div>
        {/* Ano letivo switcher */}
        <div className="flex gap-1">
          {anosLetivos.map((a) => (
            <Button key={a.id} size="sm" variant={a.id === activeAnoId ? "default" : "outline"} asChild>
              <Link href={`/admin/secretaria/unidades/${unidadeId}?anoLetivoId=${a.id}` as never}>
                {a.year}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {activeAno && (
        <TurmaForm
          unidadeId={unidadeId}
          unidadeCode={unidade.code}
          anoLetivoId={activeAno.id}
        />
      )}

      {/* Turmas grouped by etapa */}
      {Object.entries(byEtapa).length === 0 ? (
        <p className="text-sm text-navy-400">Nenhuma turma cadastrada para este ano letivo.</p>
      ) : (
        Object.entries(byEtapa).map(([etapa, list]) => (
          <section key={etapa} className="space-y-2">
            <h2 className="text-sm font-semibold text-navy-600 uppercase tracking-wide">
              {ETAPA_LABELS[etapa as Etapa]}
            </h2>
            <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
              {list.map((t) => (
                <Link
                  key={t.id}
                  href={`/admin/secretaria/turmas/${t.id}` as never}
                  className="flex items-center justify-between px-4 py-3 hover:bg-navy-50 transition-colors"
                >
                  <div>
                    <span className="font-mono font-semibold text-navy-900">{t.code}</span>
                    <span className="ml-2 text-xs text-navy-400">{PERIODO_LABELS[t.periodo]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-sm text-navy-600">
                      <Users className="h-3.5 w-3.5" />
                      {t._count.enrollments}/{t.maxStudents}
                    </span>
                    <Badge
                      variant={t._count.enrollments >= t.maxStudents ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {t._count.enrollments >= t.maxStudents ? "Lotada" : "Vagas"}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
