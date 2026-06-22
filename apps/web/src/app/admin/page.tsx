import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { prisma } from "@nexora/db";
import { Card, CardContent, CardHeader, CardTitle } from "@nexora/ui";
import { BookOpen, GraduationCap, Users, TrendingUp } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tenantId = session.user.activeTenantId;

  const [totalCourses, totalEnrollments, activeEnrollments, totalStudents] = await Promise.all([
    prisma.course.count({ where: { tenantId } }),
    prisma.enrollment.count({ where: { tenantId } }),
    prisma.enrollment.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.tenantMembership.count({ where: { tenantId, role: "STUDENT", active: true } }),
  ]);

  const stats = [
    { label: "Cursos", value: totalCourses, icon: BookOpen, color: "text-teal-600 bg-teal-50" },
    { label: "Alunos", value: totalStudents, icon: GraduationCap, color: "text-navy-600 bg-navy-50" },
    { label: "Matrículas ativas", value: activeEnrollments, icon: Users, color: "text-green-600 bg-green-50" },
    { label: "Total de matrículas", value: totalEnrollments, icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Dashboard</h1>
        <p className="text-sm text-navy-500">Bem-vindo, {session.user.name}.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-navy-500">{stat.label}</CardTitle>
                <div className={`rounded-full p-2 ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-navy-900">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
