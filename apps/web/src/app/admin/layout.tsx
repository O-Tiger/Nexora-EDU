import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ChatbotWidget } from "@/components/communication/chatbot-widget";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { getOnboardingStatus } from "@/lib/onboarding";
import { getTenantConfig } from "@nexora/db/src/queries/administracao";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { role, id: userId, activeTenantId } = session.user;
  const ADMIN_ROLES: typeof role[] = ["ADMINISTRATOR", "OWNER", "ASSISTANT", "TI_SUPPORT"];
  if (!ADMIN_ROLES.includes(role)) {
    redirect("/unauthorized");
  }

  const [onboarding, tenantConfig] = await Promise.all([
    getOnboardingStatus(userId, "admin"),
    getTenantConfig(activeTenantId),
  ]);
  const showTour = !onboarding.completed && !onboarding.skipped;

  return (
    <div className="flex min-h-screen bg-navy-50">
      <AdminSidebar
        user={{ name: session.user.name, role, tenantId: activeTenantId }}
        logoUrl={tenantConfig?.logoUrl}
      />
      <main id="main-content" className="flex-1 overflow-x-hidden" tabIndex={-1}>
        <div className="mx-auto max-w-7xl p-6 pt-16 lg:pt-6">{children}</div>
      </main>
      <ChatbotWidget />
      <OnboardingTour tourId="admin" initialVisible={showTour} />
    </div>
  );
}
