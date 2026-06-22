import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { ShieldCheck, Users, BookOpen, School, ArrowRight } from "lucide-react";
import Link from "next/link";
import { prisma } from "@nexora/db";

export const metadata: Metadata = { title: "Administração" };

const TENANTS = [
  { id: "inst_a", label: "Faculdade", description: "Plataforma EAD — cursos, matrículas, certificados", icon: BookOpen, color: "teal" },
  { id: "inst_b", label: "Colégio", description: "Secretaria escolar — turmas, alunos, financeiro", icon: School, color: "indigo" },
] as const;

const INTERNAL_ROLES = ["OWNER", "ADMINISTRATOR", "TI_SUPPORT"] as const;

async function getTenantStats(tenantId: string) {
  const [totalUsers, activeEnrollments] = await Promise.all([
    prisma.tenantMembership.count({ where: { tenantId, active: true } }),
    tenantId === "inst_b"
      ? prisma.turmaEnrollment.count({ where: { tenantId, status: "ATIVA" } })
      : prisma.enrollment.count({ where: { tenantId, status: { not: "CANCELLED" } } }),
  ]);
  return { totalUsers, activeEnrollments };
}

export default async function AdministracaoPage() {
  const session = await auth();
  if (!session) redirect("/login" as never);

  const { role } = session.user;
  if (!INTERNAL_ROLES.includes(role as typeof INTERNAL_ROLES[number])) {
    redirect("/unauthorized" as never);
  }

  const stats = await Promise.all(TENANTS.map((t) => getTenantStats(t.id)));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-teal-600" />
        <div>
          <h1 className="text-xl font-bold text-navy-900">Administração</h1>
          <p className="text-sm text-navy-500">Gestão centralizada das instituições</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {TENANTS.map((tenant, i) => {
          const Icon = tenant.icon;
          const s = stats[i]!;
          const isActive = session.user.activeTenantId === tenant.id;
          return (
            <div
              key={tenant.id}
              className={`rounded-xl border bg-white p-6 space-y-4 transition-shadow hover:shadow-md ${
                isActive ? "border-teal-300 ring-1 ring-teal-200" : "border-navy-100"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${tenant.color === "teal" ? "bg-teal-50" : "bg-indigo-50"}`}>
                    <Icon className={`h-5 w-5 ${tenant.color === "teal" ? "text-teal-600" : "text-indigo-600"}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-navy-900">{tenant.label}</p>
                    {isActive && (
                      <span className="text-xs text-teal-600 font-medium">Instituição ativa</span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm text-navy-500">{tenant.description}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-navy-50 px-3 py-2">
                  <p className="text-xs text-navy-400">Usuários ativos</p>
                  <p className="text-lg font-bold text-navy-900">{s.totalUsers}</p>
                </div>
                <div className="rounded-lg bg-navy-50 px-3 py-2">
                  <p className="text-xs text-navy-400">{tenant.id === "inst_b" ? "Matrículas ativas" : "Inscrições"}</p>
                  <p className="text-lg font-bold text-navy-900">{s.activeEnrollments}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Link
                  href={(tenant.id === "inst_b" ? "/admin/secretaria" : "/admin") as never}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-navy-200 px-3 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50 transition-colors"
                >
                  Acessar workspace
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <section className="rounded-xl border border-navy-100 bg-white p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-navy-400" />
          <h2 className="text-sm font-semibold text-navy-700">Acesso rápido</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href={"/admin/administracao/funcionarios" as never}
            className="rounded-lg border border-navy-100 px-4 py-3 text-sm font-medium text-navy-700 hover:bg-navy-50 hover:border-navy-200 transition-colors">
            Funcionários
          </Link>
          <Link href={"/admin/administracao/suporte" as never}
            className="rounded-lg border border-navy-100 px-4 py-3 text-sm font-medium text-navy-700 hover:bg-navy-50 hover:border-navy-200 transition-colors">
            Suporte Técnico
          </Link>
          <Link href={"/admin/administracao/configuracoes" as never}
            className="rounded-lg border border-navy-100 px-4 py-3 text-sm font-medium text-navy-700 hover:bg-navy-50 hover:border-navy-200 transition-colors">
            Configurações
          </Link>
        </div>
      </section>
    </div>
  );
}
