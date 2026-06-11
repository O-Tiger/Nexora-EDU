import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, ChevronRight, Users } from "lucide-react";
import { Button, Badge } from "@nexora/ui";
import { prisma } from "@nexora/db";
import { getUnidades } from "@nexora/db/src/queries/secretaria";

export const metadata: Metadata = { title: "Unidades" };

const GENDER_LABELS: Record<string, string> = {
  MASCULINO: "Masculino", FEMININO: "Feminino", MISTO: "Misto",
};

export default async function UnidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ anoLetivoId?: string }>;
}) {
  const { anoLetivoId } = await searchParams;
  const session = await auth();
  if (!session) redirect("/login");
  const tenantId = session.user.activeTenantId;

  const [unidades, anoLetivo] = await Promise.all([
    getUnidades(tenantId),
    anoLetivoId
      ? prisma.anoLetivo.findFirst({ where: { id: anoLetivoId, tenantId } })
      : null,
  ]);

  // Count turmas per unidade for this year
  const turmaCounts = anoLetivoId
    ? await prisma.turma.groupBy({
        by: ["unidadeId"],
        where: { tenantId, anoLetivoId },
        _count: { _all: true },
      })
    : [];
  const turmaCountMap = new Map(turmaCounts.map((t) => [t.unidadeId, t._count._all]));

  // Count active enrollments per unidade for this year
  const enrollmentCounts = anoLetivoId
    ? await prisma.turmaEnrollment.groupBy({
        by: ["tenantId"],
        where: { tenantId, anoLetivoId, status: "ATIVA",
          turma: { unidadeId: { in: unidades.map((u) => u.id) } },
        },
        _count: { _all: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={"/admin/secretaria" as never}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-navy-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-teal-500" />
            Unidades
          </h1>
          {anoLetivo && (
            <p className="text-xs text-navy-400">Ano letivo {anoLetivo.year}</p>
          )}
        </div>
      </div>

      {unidades.length === 0 ? (
        <div className="rounded-lg border border-navy-100 bg-white p-8 text-center">
          <Building2 className="h-10 w-10 text-navy-200 mx-auto mb-3" />
          <p className="font-medium text-navy-700">Nenhuma unidade cadastrada</p>
          <p className="text-sm text-navy-400 mt-1">
            Acesse{" "}
            <Link href={"/admin/secretaria" as never} className="text-teal-600 hover:underline">
              Secretaria
            </Link>{" "}
            para criar unidades.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
          {unidades.map((u) => {
            const turmas = turmaCountMap.get(u.id) ?? 0;
            const href = anoLetivoId
              ? `/admin/secretaria/unidades/${u.id}?anoLetivoId=${anoLetivoId}`
              : `/admin/secretaria/unidades/${u.id}`;

            return (
              <Link
                key={u.id}
                href={href as never}
                className="flex items-center justify-between px-4 py-4 hover:bg-navy-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-teal-50 p-2">
                    <Building2 className="h-5 w-5 text-teal-600" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-semibold text-navy-900">{u.name}</p>
                    <p className="text-xs text-navy-400">
                      {u.code ? <span className="font-mono mr-2">{u.code}</span> : null}
                      {GENDER_LABELS[u.gender]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {anoLetivoId && (
                    <span className="text-sm text-navy-500 flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {turmas} turma{turmas !== 1 ? "s" : ""}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-navy-300" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
