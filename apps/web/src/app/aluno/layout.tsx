import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { prisma } from "@nexora/db";
import { StudentSidebar } from "@/components/aluno/student-sidebar";
import { ChatbotWidget } from "@/components/communication/chatbot-widget";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  // LGPD: require consent before accessing the student area
  if (session.user.role === "ALUNO") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { consentedAt: true, anonymizedAt: true },
    });
    if (user?.anonymizedAt) redirect("/login?conta-removida=1" as never);
    if (!user?.consentedAt) redirect("/consentimento" as never);
  }

  return (
    <div className="flex min-h-screen bg-navy-50">
      <StudentSidebar user={{ name: session.user.name, tenantId: session.user.activeTenantId }} />
      <main id="main-content" className="flex-1 overflow-x-hidden" tabIndex={-1}>
        <div className="mx-auto max-w-5xl p-6 pt-16 lg:pt-6">{children}</div>
      </main>
      <ChatbotWidget />
    </div>
  );
}
