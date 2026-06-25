import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCircle, Phone, Mail, Shield } from "lucide-react";
import { Button, Badge } from "@nexora/ui";
import { prisma } from "@nexora/db";
import { getGuardiansByStudent, getStudentTurmaHistory } from "@nexora/db/src/queries/secretaria";
import { GuardianForm } from "@/components/secretaria/guardian-form";
import { GuardianRow } from "@/components/secretaria/guardian-row";

export const metadata: Metadata = { title: "Ficha do Aluno" };

const RELATIONSHIP_LABELS: Record<string, string> = {
  PAI: "Pai", MAE: "Mãe", RESPONSAVEL: "Responsável", OUTRO: "Outro",
};

export default async function StudentFilePage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  const tenantId = session.user.activeTenantId;

  // Verify student belongs to this tenant
  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: studentId, tenantId, role: "STUDENT", active: true },
    include: { user: { select: { id: true, name: true, email: true, phone: true, cpf: true, createdAt: true } } },
  });
  if (!membership) notFound();

  const [guardians, history] = await Promise.all([
    getGuardiansByStudent(tenantId, studentId),
    getStudentTurmaHistory(tenantId, studentId),
  ]);

  const student = membership.user;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={"/admin/secretaria" as never}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-xl font-bold text-navy-900">Ficha do Aluno</h1>
      </div>

      {/* Personal data card */}
      <section className="rounded-lg border border-navy-100 bg-white p-4 space-y-3">
        <div className="flex items-center gap-3">
          <UserCircle className="h-12 w-12 text-navy-200 shrink-0" />
          <div>
            <p className="text-lg font-bold text-navy-900">{student.name}</p>
            <p className="text-sm text-navy-500">
              Matrícula desde {new Date(student.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-navy-600">
            <Mail className="h-4 w-4 text-navy-300" />
            {student.email}
          </div>
          {student.phone && (
            <div className="flex items-center gap-2 text-navy-600">
              <Phone className="h-4 w-4 text-navy-300" />
              {student.phone}
            </div>
          )}
          {student.cpf && (
            <div className="flex items-center gap-2 text-navy-600">
              <Shield className="h-4 w-4 text-navy-300" />
              CPF: {student.cpf}
            </div>
          )}
        </div>
      </section>

      {/* Guardians */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-navy-600 uppercase tracking-wide">Responsáveis</h2>
        {guardians.length > 0 && (
          <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
            {guardians.map((g) => (
              <GuardianRow
                key={g.id}
                id={g.id}
                studentId={studentId}
                name={g.name}
                relationship={RELATIONSHIP_LABELS[g.relationship] ?? g.relationship}
                email={g.email}
                phone={g.phone}
                isPrimary={g.isPrimary}
                userId={g.userId}
              />
            ))}
          </div>
        )}
        <GuardianForm studentId={studentId} />
      </section>

      {/* Enrollment history */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-navy-600 uppercase tracking-wide">Histórico de turmas</h2>
        {history.length === 0 ? (
          <p className="text-sm text-navy-400">Nenhuma turma registrada.</p>
        ) : (
          <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
            {history.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="font-mono font-semibold text-navy-900">{e.turma.code}</span>
                  <span className="ml-2 text-xs text-navy-400">
                    {e.turma.unidade.name} · {e.turma.anoLetivo.year}
                  </span>
                </div>
                <Badge variant={e.status === "ATIVA" ? "default" : "secondary"}>
                  {e.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
