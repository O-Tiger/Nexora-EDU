import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { prisma } from "@nexora/db";
import {
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
} from "@nexora/ui";
import { GraduationCap } from "lucide-react";

export const metadata: Metadata = { title: "Alunos" };

export default async function StudentsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const students = await prisma.tenantMembership.findMany({
    where: {
      tenantId: session.user.activeTenantId,
      role: "ALUNO",
      active: true,
      user: { anonymizedAt: null },
    },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Contar matrículas por aluno
  const enrollmentCounts = await prisma.enrollment.groupBy({
    by: ["userId"],
    where: { tenantId: session.user.activeTenantId, status: "ACTIVE" },
    _count: { _all: true },
  });
  const countMap = new Map(enrollmentCounts.map((e) => [e.userId, e._count._all]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Alunos</h1>
        <p className="text-sm text-navy-500">{students.length} aluno{students.length !== 1 ? "s" : ""} cadastrado{students.length !== 1 ? "s" : ""}</p>
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-6 w-6" />}
          title="Nenhum aluno ainda"
          description="Alunos aparecem aqui quando são adicionados ao sistema."
        />
      ) : (
        <div className="rounded-lg border border-navy-100 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Matrículas ativas</TableHead>
                <TableHead>Desde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((m) => (
                <TableRow key={m.user.id}>
                  <TableCell className="font-medium">{m.user.name}</TableCell>
                  <TableCell className="text-navy-500">{m.user.email}</TableCell>
                  <TableCell>
                    <Badge variant={countMap.get(m.user.id) ? "default" : "secondary"}>
                      {countMap.get(m.user.id) ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-navy-500">
                    {new Date(m.user.createdAt).toLocaleDateString("pt-BR")}
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
