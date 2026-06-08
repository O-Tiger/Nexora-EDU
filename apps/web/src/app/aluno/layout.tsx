import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { StudentSidebar } from "@/components/aluno/student-sidebar";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-navy-50">
      <StudentSidebar user={{ name: session.user.name, tenantId: session.user.activeTenantId }} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-5xl p-6">{children}</div>
      </main>
    </div>
  );
}
