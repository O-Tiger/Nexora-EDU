"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "@nexora/ui";
import { useConfirm } from "@/hooks/use-confirm";

interface Props {
  /** Server action já vinculada ao id (ex: deleteUnidadeAction.bind(null, id)). */
  action: () => Promise<{ error?: string; success?: boolean } | void>;
  confirmTitle: string;
  confirmDescription?: string;
  ariaLabel: string;
}

/** Botão de exclusão genérico com confirmação, para listas server-rendered. */
export function InlineDeleteButton({ action, confirmTitle, confirmDescription, ariaLabel }: Props) {
  const [isPending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();

  async function handle() {
    const ok = await confirm({
      title: confirmTitle,
      description: confirmDescription ?? "Esta ação é irreversível.",
      confirmVariant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      const r = await action();
      if (r && "error" in r && r.error) {
        toast({ variant: "destructive", title: "Não foi possível excluir", description: r.error });
      }
    });
  }

  return (
    <>
      <ConfirmDialog />
      <button
        onClick={handle}
        disabled={isPending}
        className="p-1 text-navy-300 hover:text-red-500 disabled:opacity-50"
        aria-label={ariaLabel}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </>
  );
}
