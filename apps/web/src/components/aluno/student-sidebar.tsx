"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, LogOut, Menu, X, FileCheck2, MessageSquare, ShieldCheck } from "lucide-react";
import { cn, Button, BRAND } from "@nexora/ui";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";

const tenantLabels: Record<string, string> = {
  inst_a: "Faculdade",
  inst_b: "Colégio",
};

const navItems = [
  { href: "/aluno", label: "Início", icon: Home, exact: true },
  { href: "/aluno/cursos", label: "Meus Cursos", icon: BookOpen },
  { href: "/aluno/avaliacoes", label: "Avaliações", icon: FileCheck2 },
  { href: "/aluno/comunicacao", label: "Comunicação", icon: MessageSquare },
  { href: "/aluno/meus-dados", label: "Meus Dados", icon: ShieldCheck },
];

export function StudentSidebar({ user }: { user: { name: string; tenantId: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <aside aria-label="Menu lateral" className="flex h-full w-56 flex-col border-r border-navy-100 bg-white">
      <div className="border-b border-navy-100 px-4 py-4">
        <p className="font-bold text-navy-900">{BRAND.name}</p>
        <p className="text-xs text-navy-400">{tenantLabels[user.tenantId] ?? user.tenantId}</p>
      </div>
      <nav aria-label="Navegação do aluno" className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href as never}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-ring",
                active ? "bg-teal-50 text-teal-700" : "text-navy-600 hover:bg-navy-50 hover:text-navy-900",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-navy-100 px-4 py-3 space-y-2">
        <p className="truncate text-sm font-medium text-navy-800">{user.name}</p>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2 text-navy-500 hover:text-red-600 px-0"
            onClick={() => void signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </Button>
          <LocaleSwitcher />
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:flex lg:flex-col lg:w-56 lg:shrink-0 h-screen sticky top-0">
        {sidebar}
      </div>
      <div className="lg:hidden">
        <button
          className="fixed left-4 top-4 z-50 rounded-md bg-white p-2 shadow-md border border-navy-100"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5 text-navy-700" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50 w-56 shadow-xl">
              <button className="absolute right-3 top-3 p-1 text-navy-400" onClick={() => setOpen(false)} aria-label="Fechar menu">
                <X className="h-5 w-5" />
              </button>
              {sidebar}
            </div>
          </>
        )}
      </div>
    </>
  );
}
