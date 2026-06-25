"use client";

import { useTransition } from "react";
import { Button, toast } from "@nexora/ui";
import { RefreshCw } from "lucide-react";
import { gerarMensalidadesAction } from "@/actions/financeiro";

type Props = { planoId: string; planNome: string };

export function GerarMensalidadesButton({ planoId, planNome }: Props) {
  const [isPending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const r = await gerarMensalidadesAction(planoId);
      if ("error" in r) {
        toast({ variant: "destructive", title: "Erro ao gerar", description: r.error });
      } else {
        toast({ title: `${r.total} mensalidade(s) geradas`, description: `Plano: ${planNome}` });
      }
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={handle} disabled={isPending} className="gap-1.5">
      <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Gerando…" : "Gerar mensalidades"}
    </Button>
  );
}
