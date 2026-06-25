"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button, toast } from "@nexora/ui";
import { Copy } from "lucide-react";
import { criarFuncionarioAction } from "@/actions/administracao";

type Props = { tenantId: string; children: ReactNode };

export function FuncionarioForm({ tenantId, children }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<{ email: string; pwd: string } | null>(null);

  function submit(fd: FormData) {
    fd.set("tenantId", tenantId);
    startTransition(async () => {
      const r = await criarFuncionarioAction(fd);
      if ("error" in r) {
        toast({ variant: "destructive", title: "Erro", description: r.error });
        return;
      }
      if (r.tempPassword) {
        setTempPassword({ email: fd.get("email") as string, pwd: r.tempPassword });
      } else {
        toast({ title: "Funcionário adicionado" });
        setOpen(false);
      }
    });
  }

  if (tempPassword) {
    return (
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 space-y-2 text-sm max-w-sm">
        <p className="font-medium text-teal-800">Conta criada — comunique ao funcionário:</p>
        <p className="text-teal-700">Email: <span className="font-mono">{tempPassword.email}</span></p>
        <div className="flex items-center gap-2">
          <p className="text-teal-700">Senha: <span className="font-mono font-bold">{tempPassword.pwd}</span></p>
          <button onClick={() => { void navigator.clipboard.writeText(tempPassword.pwd); toast({ title: "Copiado" }); }}>
            <Copy className="h-4 w-4 text-teal-600 hover:text-teal-800" />
          </button>
        </div>
        <Button size="sm" variant="ghost" onClick={() => { setTempPassword(null); setOpen(false); }}>Fechar</Button>
      </div>
    );
  }

  if (!open) return <div onClick={() => setOpen(true)}>{children}</div>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form action={submit} className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-navy-900">Adicionar funcionário</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">Nome completo</label>
            <input name="name" required minLength={2} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">Email</label>
            <input name="email" type="email" required className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">Permissão</label>
            <select name="role" required className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
              <option value="ADMINISTRATOR">Administrador</option>
              <option value="TI_SUPPORT">Suporte TI</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Salvando..." : "Adicionar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
