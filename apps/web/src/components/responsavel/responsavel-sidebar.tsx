"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LogOut, Menu, X, FileText, CalendarDays, UserCheck, DollarSign } from "lucide-react";
import { cn, Button, BRAND } from "@nexora/ui";
import { signOut } from "next-auth/react";
import { useState } from "react";

const navItems = [
  { href: "/responsavel", label: "Início", icon: Home, exact: true, tourId: "resp-nav-inicio" },
  { href: "/responsavel/boletim", label: "Boletim", icon: FileText, tourId: "resp-nav-boletim" },
  { href: "/responsavel/frequencia", label: "Frequência", icon: UserCheck, tourId: "resp-nav-frequencia" },
  { href: "/responsavel/calendario", label: "Calendário", icon: CalendarDays, tourId: "resp-nav-calendario" },
  { href: "/responsavel/mensalidades", label: "Mensalidades", icon: DollarSign, tourId: "resp-nav-mensalidades" },
];

type Props = {
  user: { name: string };
  filhoNome: string;
  turmaCode: string | null;
};

export function ResponsavelSidebar({ user, filhoNome, turmaCode }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <aside aria-label="Menu lateral" className="flex h-full w-56 flex-col border-r border-navy-100 bg-white">
      <div className="border-b border-navy-100 px-4 py-4">
        <p className="font-bold text-navy-900">{BRAND.name}</p>
        <p className="text-xs text-navy-500">Portal do Responsável</p>
        <div className="mt-2 rounded-md bg-teal-50 px-2 py-1.5">
          <p className="text-xs font-semibold text-teal-800 truncate">{filhoNome}</p>
          {turmaCode && <p className="text-xs text-teal-600">Turma {turmaCode}</p>}
        </div>
      </div>
      <nav aria-label="Navegação do responsável" className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href as never}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              data-tour={item.tourId}
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
      <div className="border-t border-navy-100 px-4 py-3 space-y-1">
        <p className="truncate text-xs text-navy-500">{user.name}</p>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-2 text-navy-500 hover:text-red-600 px-0 w-full"
          onClick={() => void signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair
        </Button>
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
