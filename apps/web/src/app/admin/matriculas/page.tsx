import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { getEnrollmentsByTenant } from "@nexora/db/src/queries/enrollments-admin";
import { prisma } from "@nexora/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nexora/ui";
import { EnrollUserDialog } from "@/components/admin/enroll-user-dialog";
import { EnrollmentStatusBadge } from "@/components/admin/enrollment-status-badge";
import { EnrollmentsEmptyState } from "@/components/admin/enrollments-empty-state";

export const metadata: Metadata = { title: "Matrículas" };

export default async function EnrollmentsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tenantId = session.user.activeTenantId;

  const [enrollments, courses, students] = await Promise.all([
    getEnrollmentsByTenant(tenantId),
    prisma.course.findMany({
      where: { tenantId, status: "PUBLISHED" },
      select: { id: true, title: true },
    }),
    prisma.tenantMembership.findMany({
      where: { tenantId, role: "ALUNO", active: true },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const studentList = students.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Matrículas</h1>
          <p className="text-sm text-navy-500">
            {enrollments.length} matrícula{enrollments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <EnrollUserDialog courses={courses} students={studentList} />
      </div>

      {enrollments.length === 0 ? (
        <EnrollmentsEmptyState courses={courses} students={studentList} />
      ) : (
        <div className="rounded-lg border border-navy-100 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Matriculado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.userId}</TableCell>
                  <TableCell>{e.course.title}</TableCell>
                  <TableCell>
                    <EnrollmentStatusBadge status={e.status} />
                  </TableCell>
                  <TableCell>
                    {e.expiresAt ? (
                      <span
                        className={
                          new Date(e.expiresAt) < new Date() ? "text-red-600" : ""
                        }
                      >
                        {new Date(e.expiresAt).toLocaleDateString("pt-BR")}
                      </span>
                    ) : (
                      <span className="text-navy-400">Sem expiração</span>
                    )}
                  </TableCell>
                  <TableCell className="text-navy-500">
                    {new Date(e.createdAt).toLocaleDateString("pt-BR")}
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