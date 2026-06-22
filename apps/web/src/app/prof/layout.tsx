import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { ProfSidebar } from "@/components/prof/prof-sidebar";
import { ChatbotWidget } from "@/components/communication/chatbot-widget";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { getOnboardingStatus } from "@/lib/onboarding";
import { getProfessorByUserId } from "@nexora/db/src/queries/professores";

export default async function ProfLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { role, id: userId, activeTenantId } = session.user;
  if (role !== "PROFESSOR") redirect("/unauthorized");

  // Require a linked Professor record to access the portal
  const professor = await getProfessorByUserId(userId, activeTenantId);
  if (!professor) redirect("/unauthorized");

  const onboarding = await getOnboardingStatus(userId, "professor");
  const showTour = !onboarding.completed && !onboarding.skipped;

  return (
    <div className="flex min-h-screen bg-navy-50">
      <ProfSidebar user={{ name: session.user.name, tenantId: activeTenantId }} />
      <main id="main-content" className="flex-1 overflow-x-hidden" tabIndex={-1}>
        <div className="mx-auto max-w-5xl p-6 pt-16 lg:pt-6">{children}</div>
      </main>
      <ChatbotWidget />
      <OnboardingTour tourId="professor" initialVisible={showTour} />
    </div>
  );
}
