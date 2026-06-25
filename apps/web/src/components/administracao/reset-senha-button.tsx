"use client";

import { useState, useTransition } from "react";
import { Button, toast } from "@nexora/ui";
import { KeyRound, Copy } from "lucide-react";
import { resetSenhaAction } from "@/actions/administracao";

type Props = { userId: string; name: string };

export function ResetSenhaButton({ userId, name }: Props) {
  const [isPending, startTransition] = useTransition();
  const [tempPwd, setTempPwd] = useState<string | null>(null);

  function reset() {
    if (!confirm(`Redefinir senha de ${name}?`)) return;
    startTransition(async () => {
      const r = await resetSenhaAction(userId);
      if ("error" in r) {
        toast({ variant: "destructive", title: "Erro", description: String(r.error) });
      } else {
        setTempPwd(r.tempPassword);
      }
    });
  }

  if (tempPwd) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm">
        <span className="text-amber-800 font-mono font-bold">{tempPwd}</span>
        <button onClick={() => { void navigator.clipboard.writeText(tempPwd); toast({ title: "Copiado" }); }}>
          <Copy className="h-3.5 w-3.5 text-amber-600 hover:text-amber-800" />
        </button>
        <button className="text-xs text-amber-500 hover:text-amber-700" onClick={() => setTempPwd(null)}>✕</button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={reset} disabled={isPending}>
      <KeyRound className="h-3.5 w-3.5" />
      Reset senha
    </Button>
  );
}
