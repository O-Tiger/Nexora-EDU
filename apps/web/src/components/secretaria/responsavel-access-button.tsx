"use client";

import { useState, useTransition } from "react";
import { Button, toast } from "@nexora/ui";
import { KeyRound, CheckCircle, Copy } from "lucide-react";
import { createResponsavelAccountAction, revokeResponsavelAccountAction } from "@/actions/responsavel";

type Props = {
  guardianId: string;
  hasAccess: boolean;
  email?: string | null | undefined;
};

export function ResponsavelAccessButton({ guardianId, hasAccess, email }: Props) {
  const [isPending, startTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  function criar() {
    startTransition(async () => {
      const r = await createResponsavelAccountAction(guardianId);
      if ("error" in r) {
        toast({ variant: "destructive", title: "Erro", description: r.error });
        return;
      }
      setTempPassword(r.tempPassword);
      setAccountEmail(r.email);
      toast({ title: "Acesso criado", description: `Comunique a senha temporária à família.` });
    });
  }

  function revogar() {
    startTransition(async () => {
      const r = await revokeResponsavelAccountAction(guardianId);
      if ("error" in r) {
        toast({ variant: "destructive", title: "Erro", description: r.error });
      } else {
        toast({ title: "Acesso revogado" });
      }
    });
  }

  function copiar() {
    if (tempPassword) {
      void navigator.clipboard.writeText(tempPassword);
      toast({ title: "Senha copiada" });
    }
  }

  if (tempPassword) {
    return (
      <div className="rounded-md border border-teal-200 bg-teal-50 p-3 space-y-2 text-sm">
        <p className="font-medium text-teal-800">Acesso criado — comunique à família:</p>
        <p className="text-teal-700">Email: <span className="font-mono">{accountEmail}</span></p>
        <div className="flex items-center gap-2">
          <p className="text-teal-700">Senha: <span className="font-mono font-bold">{tempPassword}</span></p>
          <button onClick={copiar} className="text-teal-600 hover:text-teal-800">
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-teal-600">O responsável deve alterar a senha no primeiro acesso.</p>
        <Button size="sm" variant="ghost" onClick={() => setTempPassword(null)}>Fechar</Button>
      </div>
    );
  }

  if (hasAccess) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-xs text-teal-600 font-medium">
          <CheckCircle className="h-3.5 w-3.5" /> Portal ativo
        </span>
        <Button size="sm" variant="ghost" className="text-xs text-navy-400 h-auto py-0.5"
          onClick={revogar} disabled={isPending}>
          Revogar
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" className="gap-1.5 text-xs"
      onClick={criar} disabled={isPending || !email}>
      <KeyRound className="h-3.5 w-3.5" />
      {!email ? "Sem email" : "Criar acesso"}
    </Button>
  );
}
