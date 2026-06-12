import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { prisma } from "@nexora/db";
import { ShieldCheck } from "lucide-react";
import { PersonalDataPanel } from "@/components/aluno/personal-data-panel";

export const metadata: Metadata = { title: "Meus Dados" };

export default async function MeusDadosPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { id: userId } = session.user;

  const [user, pendingExport] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, cpf: true, phone: true, consentedAt: true, createdAt: true },
    }),
    prisma.userDataExport.findFirst({
      where: { userId, status: "READY", expiresAt: { gte: new Date() } },
      select: { id: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-teal-500" />
          Meus Dados
        </h1>
        <p className="mt-1 text-sm text-navy-500">
          Seus direitos conforme a LGPD (Lei nº 13.709/2018).
        </p>
      </div>

      <PersonalDataPanel
        user={{
          name: user.name,
          email: user.email,
          cpf: user.cpf,
          phone: user.phone,
          consentedAt: user.consentedAt?.toISOString() ?? null,
          memberSince: user.createdAt.toISOString(),
        }}
        pendingExport={pendingExport
          ? { id: pendingExport.id, expiresAt: pendingExport.expiresAt?.toISOString() ?? "" }
          : null
        }
      />
    </div>
  );
}
