import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { School, Building2, BookOpen, Users, ChevronRight, BookMarked, FileText, DollarSign, BookmarkCheck } from "lucide-react";
import { Button } from "@nexora/ui";
import { getAnosLetivos, getAnoLetivoAtivo, getUnidades, getSecretariaOverview } from "@nexora/db/src/queries/secretaria";
import { AnoLetivoForm } from "@/components/secretaria/ano-letivo-form";
import { UnidadeForm } from "@/components/secretaria/unidade-form";
import { AnoLetivoStatusBadge } from "@/components/secretaria/ano-letivo-status-badge";
import { InlineDeleteButton } from "@/components/secretaria/inline-delete-button";
import { deleteAnoLetivoAction, deleteUnidadeAction } from "@/actions/secretaria";

export const metadata: Metadata = { title: "Secretaria" };

export default async function SecretariaPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const tenantId = session.user.activeTenantId;

  const [anosLetivos, unidades, anoAtivo] = await Promise.all([
    getAnosLetivos(tenantId),
    getUnidades(tenantId, false),
    getAnoLetivoAtivo(tenantId),
  ]);

  const overview = anoAtivo
    ? await getSecretariaOverview(tenantId, anoAtivo.id)
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
          <School className="h-6 w-6 text-teal-500" />
          Secretaria
        </h1>
        <p className="text-sm text-navy-500">Gestão de unidades, turmas e matrículas K-12.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={"/admin/secretaria/disciplinas" as never} className="gap-2">
            <BookMarked className="h-4 w-4" /> Disciplinas & Frentes
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={"/admin/secretaria/boletins" as never} className="gap-2">
            <FileText className="h-4 w-4" /> Boletins
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={"/admin/secretaria/financeiro" as never} className="gap-2">
            <DollarSign className="h-4 w-4" /> Financeiro
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={"/admin/secretaria/reservas" as never} className="gap-2">
            <BookmarkCheck className="h-4 w-4" /> Reservas de Vaga
          </Link>
        </Button>
      </div>

      {/* Overview cards */}
      {anoAtivo && overview && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Unidades ativas", value: overview.unidades, icon: Building2 },
            { label: "Turmas", value: overview.turmas, icon: BookOpen },
            { label: "Alunos matriculados", value: overview.enrollments, icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-navy-100 bg-white p-4 flex items-center gap-3">
              <div className="rounded-full bg-teal-50 p-2">
                <Icon className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy-900">{value}</p>
                <p className="text-xs text-navy-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Anos letivos */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-teal-500" />
              Anos Letivos
            </h2>
          </div>

          <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
            {anosLetivos.map((al) => (
              <div key={al.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-navy-900">{al.year}</p>
                  <p className="text-xs text-navy-400">
                    {new Date(al.startDate).toLocaleDateString("pt-BR")} –{" "}
                    {new Date(al.endDate).toLocaleDateString("pt-BR")} ·{" "}
                    {al._count.turmas} turma{al._count.turmas !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AnoLetivoStatusBadge status={al.status} id={al.id} />
                  <InlineDeleteButton
                    action={deleteAnoLetivoAction.bind(null, al.id)}
                    confirmTitle={`Excluir ano letivo ${al.year}?`}
                    confirmDescription="Só é possível excluir anos sem turmas vinculadas."
                    ariaLabel={`Excluir ano letivo ${al.year}`}
                  />
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/secretaria/unidades?anoLetivoId=${al.id}` as never}>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
            {anosLetivos.length === 0 && (
              <p className="px-4 py-6 text-sm text-navy-400 text-center">Nenhum ano letivo cadastrado.</p>
            )}
          </div>

          <AnoLetivoForm />
        </section>

        {/* Unidades */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-500" />
              Unidades
            </h2>
          </div>

          <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
            {unidades.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-navy-900">{u.name}</p>
                  <p className="text-xs text-navy-400">
                    Código: <span className="font-mono">{u.code || "—"}</span> ·{" "}
                    {{MASCULINO: "Masculino", FEMININO: "Feminino", MISTO: "Misto"}[u.gender]}
                    {!u.active && " · Inativa"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <InlineDeleteButton
                    action={deleteUnidadeAction.bind(null, u.id)}
                    confirmTitle={`Excluir unidade ${u.name}?`}
                    confirmDescription="Só é possível excluir unidades sem turmas vinculadas."
                    ariaLabel={`Excluir unidade ${u.name}`}
                  />
                  {anoAtivo && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/secretaria/unidades/${u.id}?anoLetivoId=${anoAtivo.id}` as never}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {unidades.length === 0 && (
              <p className="px-4 py-6 text-sm text-navy-400 text-center">Nenhuma unidade cadastrada.</p>
            )}
          </div>

          <UnidadeForm />
        </section>
      </div>
    </div>
  );
}
