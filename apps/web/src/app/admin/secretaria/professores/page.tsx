import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCog } from "lucide-react";
import { Button, EmptyState } from "@nexora/ui";
import { getProfessoresComVinculos } from "@nexora/db/src/queries/professores";

export const metadata: Metadata = { title: "Professores" };

export default async function ProfessoresPage() {
  const session = await auth();
  if (!session) redirect("/login");
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
          <p className="text-sm text-navy-500">{professores.length} professor{professores.length !== 1 ? "es" : ""} · disciplinas vinculadas por turma</p>
        </div>
      </div>

      {professores.length === 0 ? (
        <EmptyState
          icon={<UserCog className="h-6 w-6" />}
          title="Nenhum professor cadastrado"
          description="Usuários com papel PROFESSOR aparecem aqui. Vincule-os às disciplinas pela página de horário da turma."
        />
      ) : (
        <div className="space-y-3">
          {professores.map((p) => (
            <div key={p.id} className="rounded-lg border border-navy-100 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-navy-900">{p.name}</p>
                  <p className="text-xs text-navy-400 truncate">{p.email}</p>
                </div>
                <span className="text-xs text-navy-500 shrink-0">
                  {p.vinculos.length} vínculo{p.vinculos.length !== 1 ? "s" : ""}
                </span>
              </div>
              {p.vinculos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.vinculos.map((v, i) => (
                    <span key={i} className="rounded bg-navy-50 px-2 py-1 text-xs text-navy-700">
                      <span className="font-mono">{v.turmaCode}</span> · {v.disciplinaName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
