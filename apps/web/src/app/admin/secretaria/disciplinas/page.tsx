import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookMarked } from "lucide-react";
import { Button } from "@nexora/ui";
import { getDisciplinas } from "@nexora/db/src/queries/pedagogico";
import { DisciplinasManager } from "@/components/secretaria/disciplinas-manager";

export const metadata: Metadata = { title: "Disciplinas" };

export default async function DisciplinasPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const disciplinas = await getDisciplinas(session.user.activeTenantId);

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={"/admin/secretaria" as never}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-navy-900 flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-teal-500" />
            Disciplinas
          </h1>
          <p className="text-xs text-navy-400">
            Cadastre disciplinas e suas frentes (sub-divisões graduadas separadamente).
          </p>
        </div>
      </div>

      <DisciplinasManager
        initial={disciplinas.map((d) => ({
          id: d.id,
          name: d.name,
          position: d.position,
          color: d.color,
          isItinerario: d.isItinerario,
          frentes: d.frentes.map((f) => ({ id: f.id, name: f.name, position: f.position, color: f.color })),
        }))}
      />
    </div>
  );
}
