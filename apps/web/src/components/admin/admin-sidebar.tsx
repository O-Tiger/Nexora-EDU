"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Users, GraduationCap, LayoutDashboard, LogOut, Menu, Upload, X, Layout, MessageSquare } from "lucide-react";
import { cn, Badge, Button, BRAND } from "@nexora/ui";
import { signOut } from "next-auth/react";
import { useState } from "react";
import type { Role } from "@nexora/db";

const tenantLabels: Record<string, string> = {
  inst_a: "Faculdade",
  inst_b: "Colégio",
};

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
  COORDENADOR: "Coordenador",
};

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/cursos", label: "Cursos", icon: BookOpen },
  { href: "/admin/alunos", label: "Alunos", icon: GraduationCap },
  { href: "/admin/matriculas", label: "Matrículas", icon: Users },
  { href: "/admin/paginas", label: "Páginas", icon: Layout },
  { href: "/admin/comunicacao", label: "Comunicação", icon: MessageSquare },
  { href: "/admin/importar", label: "Importar curso", icon: Upload },
];

interface Props {
  user: { name: string; role: Role; tenantId: string };
}

export function AdminSidebar({ user }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <aside className="flex h-full w-64 flex-col border-r border-navy-100 bg-white">
      <div className="border-b border-navy-100 px-5 py-4">
        <p className="text-lg font-bold text-navy-900">{BRAND.name}</p>
        <p className="text-xs text-navy-400">{tenantLabels[user.tenantId] ?? user.tenantId}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href as never}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-teal-50 text-teal-700"
                  : "text-navy-600 hover:bg-navy-50 hover:text-navy-900",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-navy-100 px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-navy-800">{user.name}</p>
            <p className="text-xs text-navy-400">{roleLabels[user.role] ?? user.role}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {roleLabels[user.role] ?? user.role}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-navy-500 hover:text-red-600"
          onClick={() => void signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 h-screen sticky top-0">
        {sidebar}
      </div>

      {/* Mobile: hamburger + drawer */}
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
            <div
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 flex flex-col w-64 shadow-xl">
              <button
                className="absolute right-3 top-3 p-1 text-navy-400 hover:text-navy-700"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
              >
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
