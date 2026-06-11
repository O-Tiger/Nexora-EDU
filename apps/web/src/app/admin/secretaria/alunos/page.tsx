import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GraduationCap, ChevronRight } from "lucide-react";
import {
  Button, EmptyState, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@nexora/ui";
import { prisma } from "@nexora/db";
import { getAnosLetivos, getAnoLetivoAtivo } from "@nexora/db/src/queries/secretaria";

export const metadata: Metadata = { title: "Alunos da Escola" };

export default async function SecretariaAlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ anoLetivoId?: string }>;
}) {
  const { anoLetivoId } = await searchParams;
  const session = await auth();
  if (!session) redirect("/login");
  const tenantId = session.user.activeTenantId;

  const [anos, ativo] = await Promise.all([getAnosLetivos(tenantId), getAnoLetivoAtivo(tenantId)]);
  const activeAnoId = anoLetivoId ?? ativo?.id ?? anos[0]?.id;

  // Alunos da escola = quem tem matrícula em turma no ano letivo ativo
  const enrollments = activeAnoId
    ? await prisma.turmaEnrollment.findMany({
        where: { tenantId, anoLetivoId: activeAnoId, status: "ATIVA" },
        include: {
          student: { select: { id: true, name: true, email: true } },
          turma: { include: { unidade: { select: { name: true } } } },
        },
        orderBy: { student: { name: "asc" } },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={"/admin/secretaria" as never}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-teal-500" />
            Alunos da Escola
          </h1>
          <p className="text-sm text-navy-500">
            {enrollments.length} aluno{enrollments.length !== 1 ? "s" : ""} matriculado{enrollments.length !== 1 ? "s" : ""} em turma
            {ativo ? ` · ${ativo.year}` : ""}
          </p>
        </div>
        <div className="flex gap-1">
          {anos.map((a) => (
            <Button key={a.id} size="sm" variant={a.id === activeAnoId ? "default" : "outline"} asChild>
              <Link href={`/admin/secretaria/alunos?anoLetivoId=${a.id}` as never}>{a.year}</Link>
            </Button>
          ))}
        </div>
      </div>

      {enrollments.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-6 w-6" />}
          title="Nenhum aluno matriculado"
          description="Matricule alunos nas turmas pela página da turma para vê-los aqui."
        />
      ) : (
        <div className="rounded-lg border border-navy-100 bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.student.name}</TableCell>
                  <TableCell className="font-mono text-navy-600">{e.turma.code}</TableCell>
                  <TableCell className="text-navy-500">{e.turma.unidade.name}</TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/secretaria/alunos/${e.student.id}` as never}
                      className="text-navy-300 hover:text-teal-600"
                      aria-label={`Ficha de ${e.student.name}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
