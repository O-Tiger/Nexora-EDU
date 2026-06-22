import { redirect } from "next/navigation";
import { auth } from "@nexora/auth";
import { BRAND } from "@nexora/ui";
import Link from "next/link";
import { GraduationCap, BookOpen, School, ArrowRight } from "lucide-react";

export default async function RootPage() {
  const session = await auth();

  if (session) {
    const role = session.user.role;
    if (role === "OWNER" || role === "ADMINISTRATOR" || role === "ASSISTANT" || role === "TI_SUPPORT") {
      redirect("/admin");
    }
    if (role === "PROFESSOR") redirect("/prof");
    if (role === "RESPONSIBLE") redirect("/responsavel");
    if (role === "STUDENT") redirect("/aluno");
    // Role desconhecido (ex: token antigo pré-migração) → força novo login
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-teal-900 flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">{BRAND.name}</span>
        </div>
        <Link
          href="/login"
          className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
        >
          Acessar Login
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-8 py-16">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-sm text-teal-300">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
            Plataforma educacional completa
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
            {BRAND.tagline}
          </h1>
          <p className="text-lg text-navy-300 max-w-xl mx-auto">
            Gestão escolar, ensino à distância e comunicação integrados em uma única plataforma.
          </p>
        </div>

        <Link
          href="/login"
          className="flex items-center gap-2.5 rounded-xl bg-teal-500 px-8 py-3.5 text-base font-semibold text-white hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/20"
        >
          Acessar página de Login
          <ArrowRight className="h-5 w-5" />
        </Link>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full mt-4">
          {[
            { icon: BookOpen,    title: "Faculdade EAD",     desc: "Cursos, matrículas e certificados digitais" },
            { icon: School,      title: "Secretaria Escolar", desc: "Turmas, boletins, frequência e financeiro" },
            { icon: GraduationCap, title: "Portal do Responsável", desc: "Acompanhe o desempenho do seu filho" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 text-left">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/20 mb-3">
                <Icon className="h-5 w-5 text-teal-400" />
              </div>
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="text-xs text-navy-300 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-navy-500">
        © {new Date().getFullYear()} {BRAND.name}
        {BRAND.supportEmail && (
          <> · <a href={`mailto:${BRAND.supportEmail}`} className="hover:text-navy-400">{BRAND.supportEmail}</a></>
        )}
      </footer>
    </div>
  );
}
