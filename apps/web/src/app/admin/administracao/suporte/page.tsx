import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { prisma } from "@nexora/db";
import { ResetSenhaButton } from "@/components/administracao/reset-senha-button";
import { AlterarRoleForm } from "@/components/administracao/alterar-role-form";

export const metadata: Metadata = { title: "Suporte Técnico" };

const ROLE_LABELS: Record<string, string> = {
  OWNER:         "Owner",
  ADMINISTRATOR: "Administrador",
  TI_SUPPORT:    "Suporte TI",
  ASSISTANT:     "Coordenador",
  PROFESSOR:     "Professor",
  STUDENT:       "Aluno",
  RESPONSIBLE:   "Responsável",
};

export default async function SuportePage() {
  const session = await auth();
  if (!session) redirect("/login" as never);

  const tenantId = session.user.activeTenantId;

  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId, active: true, user: { anonymizedAt: null } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Wrench className="h-5 w-5 text-teal-600" />
        <h1 className="text-xl font-bold text-navy-900">Suporte Técnico</h1>
      </div>

      <p className="text-sm text-navy-500">
        Gerencie acessos, redefina senhas e altere permissões dos usuários desta instituição.
      </p>

      <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
        {memberships.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-4 py-3 flex-wrap gap-3">
            <div>
              <p className="text-sm font-medium text-navy-900">{m.user.name}</p>
              <p className="text-xs text-navy-400">{m.user.email} · {ROLE_LABELS[m.role] ?? m.role}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {m.role !== "OWNER" && (
                <>
                  <AlterarRoleForm membershipId={m.id} currentRole={m.role} />
                  <ResetSenhaButton userId={m.user.id} name={m.user.name} />
                </>
              )}
            </div>
          </div>
        ))}
        {memberships.length === 0 && (
          <p className="px-4 py-8 text-sm text-navy-400 text-center">Nenhum usuário encontrado.</p>
        )}
      </div>
    </div>
  );
}
