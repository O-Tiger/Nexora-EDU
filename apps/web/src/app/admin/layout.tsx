import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { role } = session.user;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "COORDENADOR") {
    redirect("/unauthorized");
  }

  return (
    <div className="flex min-h-screen bg-navy-50">
      <AdminSidebar user={{ name: session.user.name, role, tenantId: session.user.activeTenantId }} />
      <main id="main-content" className="flex-1 overflow-x-hidden" tabIndex={-1}>
        <div className="mx-auto max-w-7xl p-6 pt-16 lg:pt-6">{children}</div>
      </main>
    </div>
  );
}
