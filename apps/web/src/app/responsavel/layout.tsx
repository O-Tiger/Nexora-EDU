import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { getFilhosFromSession } from "@/lib/responsavel";
import { ResponsavelSidebar } from "@/components/responsavel/responsavel-sidebar";
import { ChatbotWidget } from "@/components/communication/chatbot-widget";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { getOnboardingStatus } from "@/lib/onboarding";

export default async function ResponsavelLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "RESPONSIBLE") redirect("/unauthorized");

  const filhos = await getFilhosFromSession(session.user.id, session.user.activeTenantId);

  if (filhos.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-50 p-6">
        <div className="rounded-lg border border-navy-100 bg-white p-8 max-w-sm text-center space-y-3">
          <p className="text-lg font-semibold text-navy-900">Sem vínculo encontrado</p>
          <p className="text-sm text-navy-500">
            Sua conta ainda não está vinculada a nenhum aluno. Entre em contato com a secretaria.
          </p>
        </div>
      </div>
    );
  }

  // Primeiro filho como padrão (maioria dos casos é filho único)
  const filho = filhos[0]!;

  const onboarding = await getOnboardingStatus(session.user.id, "responsavel");
  const showTour = !onboarding.completed && !onboarding.skipped;

  return (
    <div className="flex min-h-screen bg-navy-50">
      <ResponsavelSidebar
        user={{ name: session.user.name }}
        filhoNome={filho.studentName}
        turmaCode={filho.turmaCode}
      />
      <main id="main-content" className="flex-1 overflow-x-hidden" tabIndex={-1}>
        <div className="mx-auto max-w-4xl p-6 pt-16 lg:pt-6">{children}</div>
      </main>
      <ChatbotWidget />
      <OnboardingTour tourId="responsavel" initialVisible={showTour} />
    </div>
  );
}
