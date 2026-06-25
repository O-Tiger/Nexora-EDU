import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { getTenantConfig, formatarEmailInstitucional } from "@nexora/db/src/queries/administracao";
import { ConfigForm } from "@/components/administracao/config-form";

export const metadata: Metadata = { title: "Configurações" };

const TENANT_LABELS: Record<string, string> = {
  inst_a: "Faculdade",
  inst_b: "Colégio",
};

export default async function ConfiguracoesPage() {
  const session = await auth();
  if (!session) redirect("/login" as never);

  const tenantId = session.user.activeTenantId;
  const config = await getTenantConfig(tenantId);

  const preview = config?.emailDomain
    ? formatarEmailInstitucional("João Silva", config)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-teal-600" />
        <div>
          <h1 className="text-xl font-bold text-navy-900">Configurações</h1>
          <p className="text-sm text-navy-500">{TENANT_LABELS[tenantId] ?? tenantId}</p>
        </div>
      </div>

      <ConfigForm tenantId={tenantId} config={config} emailPreview={preview} />
    </div>
  );
}
