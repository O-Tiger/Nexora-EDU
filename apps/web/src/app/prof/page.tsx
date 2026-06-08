import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Painel do Professor" };

export default async function ProfDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold text-navy-900">Painel do Professor</h1>
      <p className="mt-2 text-navy-500">Olá, {session.user.name}.</p>
      {/* TODO(fase-1): listar cursos e turmas do professor */}
    </main>
  );
}
