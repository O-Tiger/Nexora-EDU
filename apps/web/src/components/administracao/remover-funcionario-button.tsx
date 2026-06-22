"use client";

import { useTransition } from "react";
import { Button, toast } from "@nexora/ui";
import { Trash2 } from "lucide-react";
import { removerFuncionarioAction } from "@/actions/administracao";

type Props = { membershipId: string; name: string };

export function RemoverFuncionarioButton({ membershipId, name }: Props) {
  const [isPending, startTransition] = useTransition();

  function remove() {
    if (!confirm(`Remover acesso de ${name}?`)) return;
    startTransition(async () => {
      const r = await removerFuncionarioAction(membershipId);
      if ("error" in r) {
        toast({ variant: "destructive", title: "Erro", description: r.error });
      } else {
        toast({ title: "Acesso removido" });
      }
    });
  }

  return (
    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 h-auto py-1" onClick={remove} disabled={isPending}>
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
