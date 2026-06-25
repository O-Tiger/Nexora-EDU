import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { UserCog2, Plus, ShieldOff } from "lucide-react";
import { getStaffByTenant } from "@nexora/db/src/queries/administracao";
import { FuncionarioForm } from "@/components/administracao/funcionario-form";
import { RemoverFuncionarioButton } from "@/components/administracao/remover-funcionario-button";

export const metadata: Metadata = { title: "Funcionários" };

const ROLE_LABELS: Record<string, string> = {
  OWNER:         "Owner",
  ADMINISTRATOR: "Administrador",
  TI_SUPPORT:    "Suporte TI",
};

const ROLE_BADGE: Record<string, string> = {
  OWNER:         "bg-purple-50 text-purple-700",
  ADMINISTRATOR: "bg-teal-50 text-teal-700",
  TI_SUPPORT:    "bg-blue-50 text-blue-700",
};

export default async function FuncionariosPage() {
  const session = await auth();
  if (!session) redirect("/login" as never);

  const tenantId = session.user.activeTenantId;
  const staff = await getStaffByTenant(tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <UserCog2 className="h-5 w-5 text-teal-600" />
          <h1 className="text-xl font-bold text-navy-900">Funcionários</h1>
        </div>
        <FuncionarioForm tenantId={tenantId}>
          <button className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors">
            <Plus className="h-4 w-4" /> Adicionar funcionário
          </button>
        </FuncionarioForm>
      </div>

      <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
        {staff.map((s) => (
          <div key={s.membershipId} className="flex items-center justify-between px-4 py-3 flex-wrap gap-3">
            <div>
              <p className="text-sm font-medium text-navy-900">{s.name}</p>
              <p className="text-xs text-navy-400">{s.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[s.role] ?? "bg-navy-50 text-navy-600"}`}>
                {ROLE_LABELS[s.role] ?? s.role}
              </span>
              {!s.active && (
                <span className="flex items-center gap-1 text-xs text-navy-400">
                  <ShieldOff className="h-3.5 w-3.5" /> Inativo
                </span>
              )}
              {s.role !== "OWNER" && (
                <RemoverFuncionarioButton membershipId={s.membershipId} name={s.name} />
              )}
            </div>
          </div>
        ))}
        {staff.length === 0 && (
          <p className="px-4 py-8 text-sm text-navy-400 text-center">Nenhum funcionário cadastrado.</p>
        )}
      </div>
    </div>
  );
}
