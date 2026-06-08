import { redirect } from "next/navigation";
import { auth } from "@nexora/auth";

export default async function RootPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Redireciona para o painel correto baseado na role
  const role = session.user.role;
  if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "COORDENADOR") {
    redirect("/admin");
  }
  if (role === "PROFESSOR") {
    redirect("/prof");
  }
  redirect("/aluno");
}
