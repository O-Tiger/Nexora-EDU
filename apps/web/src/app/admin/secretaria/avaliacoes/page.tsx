import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { getAvaliacoesConfig } from "@nexora/db/src/queries/avaliacoes";
import { AvaliacoesManager } from "@/components/secretaria/avaliacoes-manager";

export const metadata: Metadata = { title: "Avaliações" };

export default async function AvaliacoesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { activeTenantId: tenantId, role } = session.user;
  if (role !== "OWNER" && role !== "ADMINISTRATOR") redirect("/unauthorized");

  const configs = await getAvaliacoesConfig(tenantId);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-navy-900">Avaliações</h1>
        <p className="text-sm text-navy-500">Configure as avaliações do ano letivo: sigla, período, tipo e peso.</p>
      </div>
      <AvaliacoesManager initial={configs} />
    </div>
  );
}
