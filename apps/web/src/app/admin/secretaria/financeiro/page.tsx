import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DollarSign, ArrowLeft } from "lucide-react";
import { Button } from "@nexora/ui";
import { getAnoLetivoAtivo } from "@nexora/db/src/queries/secretaria";
import { getPlanosByAnoLetivo, getFinanceiroOverview, getMensalidadesByAnoLetivo } from "@nexora/db/src/queries/financeiro";
import { FinanceiroStats } from "@/components/secretaria/financeiro-stats";
import { PlanoForm } from "@/components/secretaria/plano-form";
import { GerarMensalidadesButton } from "@/components/secretaria/gerar-mensalidades-button";
import { MensalidadesTable } from "@/components/secretaria/mensalidades-table";
import { InlineDeleteButton } from "@/components/secretaria/inline-delete-button";
import { deletePlanoCobrancaAction } from "@/actions/financeiro";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinanceiroPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const tenantId = session.user.activeTenantId;

  const anoAtivo = await getAnoLetivoAtivo(tenantId);

  if (!anoAtivo) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={"/admin/secretaria" as never}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-teal-500" /> Financeiro
          </h1>
        </div>
        <p className="text-sm text-navy-500">Nenhum ano letivo ativo. Ative um ano letivo na Secretaria.</p>
      </div>
    );
  }

  const [planos, overview, mensalidades] = await Promise.all([
    getPlanosByAnoLetivo(tenantId, anoAtivo.id),
    getFinanceiroOverview(tenantId, anoAtivo.id),
    getMensalidadesByAnoLetivo(tenantId, anoAtivo.id),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={"/admin/secretaria" as never}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-teal-500" /> Financeiro
            </h1>
            <p className="text-sm text-navy-500">Mensalidades do ano letivo {anoAtivo.year}</p>
          </div>
        </div>
      </div>

      <FinanceiroStats {...overview} />

      {/* Planos de cobrança */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">Planos de cobrança</h2>

        <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
          {planos.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 flex-wrap gap-2">
              <div>
                <p className="font-medium text-navy-900">{p.nome}</p>
                <p className="text-xs text-navy-500">
                  {(p.valorCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ·
                  Vence dia {p.vencimentoDia} ·
                  {p.turma ? ` Turma ${p.turma.code} ·` : " Todas as turmas ·"}
                  {" "}{p.meses.length} meses ·
                  {p.ativo ? " Ativo" : " Inativo"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <GerarMensalidadesButton planoId={p.id} planNome={p.nome} />
                <InlineDeleteButton
                  action={deletePlanoCobrancaAction.bind(null, p.id)}
                  confirmTitle={`Excluir plano "${p.nome}"?`}
                  confirmDescription="Só é possível excluir planos sem mensalidades geradas."
                  ariaLabel={`Excluir plano ${p.nome}`}
                />
              </div>
            </div>
          ))}
          {planos.length === 0 && (
            <p className="px-4 py-6 text-sm text-navy-400 text-center">Nenhum plano cadastrado. Crie um abaixo.</p>
          )}
        </div>

        <PlanoForm anoLetivoId={anoAtivo.id} />
      </section>

      {/* Mensalidades */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">Mensalidades</h2>
        <MensalidadesTable mensalidades={mensalidades} />
      </section>
    </div>
  );
}
