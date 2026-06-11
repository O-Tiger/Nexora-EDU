import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { Globe } from "lucide-react";
import { getDomainsByTenant } from "@nexora/db/src/queries/domains";
import { DomainsManager } from "@/components/admin/domains-manager";

export const metadata: Metadata = { title: "Domínios" };

export default async function DominiosPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId } = session.user;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/unauthorized");

  const domains = await getDomainsByTenant(activeTenantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
          <Globe className="h-6 w-6 text-teal-500" />
          Domínios
        </h1>
        <p className="text-sm text-navy-500">
          Domínios públicos que servem as páginas do Page Builder sem exigir login.
        </p>
      </div>

      <DomainsManager initial={domains.map((d) => ({ id: d.id, domain: d.domain, isPrimary: d.isPrimary }))} />
    </div>
  );
}
