import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCog } from "lucide-react";
import { Button } from "@nexora/ui";
import { getProfessoresComVinculos } from "@nexora/db/src/queries/professores";
import { ProfessoresManager } from "@/components/secretaria/professores-manager";

export const metadata: Metadata = { title: "Professores" };

export default async function ProfessoresPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role } = session.user;
  if (role !== "ADMINISTRATOR" && role !== "OWNER" && role !== "ASSISTANT") redirect("/unauthorized");

  const professores = await getProfessoresComVinculos(session.user.activeTenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={"/admin/secretaria" as never}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
            <UserCog className="h-6 w-6 text-teal-500" />
            Professores
          </h1>
          <p className="text-sm text-navy-500">{professores.length} professor{professores.length !== 1 ? "es" : ""} · cadastro interno (sem login)</p>
        </div>
      </div>

      <ProfessoresManager initial={professores} />
    </div>
  );
}
