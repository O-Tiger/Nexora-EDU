import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookmarkCheck } from "lucide-react";
import { Button } from "@nexora/ui";
import { prisma } from "@nexora/db";
import { getAnosLetivos, getAnoLetivoAtivo } from "@nexora/db/src/queries/secretaria";
import { getReservasByAnoLetivo, getReservasOverview } from "@nexora/db/src/queries/reservas";
import { ReservasTable } from "@/components/secretaria/reservas-table";
import { ReservaForm } from "@/components/secretaria/reserva-form";

export const metadata: Metadata = { title: "Reservas de Vaga" };

export default async function ReservasPage() {
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
            <BookmarkCheck className="h-6 w-6 text-teal-500" /> Reservas de Vaga
          </h1>
        </div>
        <p className="text-sm text-navy-500">Nenhum ano letivo ativo.</p>
      </div>
    );
  }

  // Próximo ano letivo — necessário para criar reservas
  const todosAnos = await getAnosLetivos(tenantId);
  const proximoAnoLetivo = todosAnos.find((a) => a.year === anoAtivo.year + 1) ?? null;

  const [reservas, overview] = await Promise.all([
    getReservasByAnoLetivo(tenantId, anoAtivo.id),
    getReservasOverview(tenantId, anoAtivo.id),
  ]);

  // Alunos ativos no ano atual para o formulário
  const enrollmentsAtivos = await prisma.turmaEnrollment.findMany({
    where: { tenantId, anoLetivoId: anoAtivo.id, status: "ATIVA" },
    include: {
      student: { select: { id: true, name: true } },
      turma: { select: { id: true, code: true } },
    },
    orderBy: { student: { name: "asc" } },
  });

  const alunosEnrollments = enrollmentsAtivos.map((e) => ({
    studentId: e.studentId,
    studentName: e.student.name,
    turmaId: e.turmaId,
    turmaCode: e.turma.code,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={"/admin/secretaria" as never}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
              <BookmarkCheck className="h-6 w-6 text-teal-500" /> Reservas de Vaga
            </h1>
            <p className="text-sm text-navy-500">
              Processo de rematrícula — ano letivo {anoAtivo.year}
              {proximoAnoLetivo && ` → ${proximoAnoLetivo.year}`}
            </p>
          </div>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: overview.total, color: "text-navy-900" },
          { label: "Pendentes", value: overview.pendentes, color: "text-amber-600" },
          { label: "Vagas garantidas", value: overview.pagas, color: "text-teal-600" },
          { label: "Confirmadas", value: overview.confirmadas, color: "text-indigo-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-navy-100 bg-white p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-navy-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {!proximoAnoLetivo && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Para criar reservas, cadastre o ano letivo {anoAtivo.year + 1} na{" "}
          <Link href={"/admin/secretaria" as never} className="underline font-medium">Secretaria</Link>.
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">Reservas</h2>
        <ReservasTable reservas={reservas} />

        {proximoAnoLetivo && (
          <ReservaForm
            anoLetivoAtualId={anoAtivo.id}
            proximoAnoLetivoId={proximoAnoLetivo.id}
            proximoAno={proximoAnoLetivo.year}
            alunosEnrollments={alunosEnrollments}
          />
        )}
      </section>
    </div>
  );
}
