"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, toast } from "@nexora/ui";
import { Trash2 } from "lucide-react";
import { deleteTurmaAction } from "@/actions/secretaria";
import { useConfirm } from "@/hooks/use-confirm";

interface Props {
  turmaId: string;
  code: string;
  unidadeId: string;
  anoLetivoId: string;
  hasStudents: boolean;
}

export function TurmaDeleteButton({ turmaId, code, unidadeId, anoLetivoId, hasStudents }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();

  async function handleDelete() {
    if (hasStudents) {
      toast({
        variant: "destructive",
        title: "Não é possível excluir",
        description: "Cancele ou transfira os alunos matriculados antes de excluir a turma.",
      });
      return;
    }
    const ok = await confirm({
      title: `Excluir turma ${code}?`,
      description: "Esta ação é irreversível.",
      confirmLabel: "Excluir turma",
      confirmVariant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      const r = await deleteTurmaAction(turmaId);
      if ("error" in r) {
        toast({ variant: "destructive", title: "Erro", description: r.error });
        return;
      }
      toast({ title: "Turma excluída" });
      router.push(`/admin/secretaria/unidades/${unidadeId}?anoLetivoId=${anoLetivoId}` as never);
    });
  }

  return (
    <>
      <ConfirmDialog />
      <Button
        variant="outline"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
        className="gap-2 text-red-600 hover:text-red-700 hover:border-red-300"
      >
        <Trash2 className="h-4 w-4" />
        Excluir turma
      </Button>
    </>
  );
}
