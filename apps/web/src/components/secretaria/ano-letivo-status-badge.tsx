"use client";

import { useTransition } from "react";
import { Badge } from "@nexora/ui";
import { updateAnoLetivoStatusAction } from "@/actions/secretaria";

type Status = "PLANEJADO" | "EM_ANDAMENTO" | "ENCERRADO";

const STATUS_CONFIG: Record<Status, { label: string; variant: "secondary" | "default" | "outline"; next?: Status; nextLabel?: string }> = {
  PLANEJADO:    { label: "Planejado",     variant: "secondary", next: "EM_ANDAMENTO", nextLabel: "Iniciar" },
  EM_ANDAMENTO: { label: "Em andamento",  variant: "default",   next: "ENCERRADO",    nextLabel: "Encerrar" },
  ENCERRADO:    { label: "Encerrado",     variant: "outline" },
};

interface Props { status: Status; id: string }

export function AnoLetivoStatusBadge({ status, id }: Props) {
  const [isPending, startTransition] = useTransition();
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-1.5">
      <Badge variant={config.variant}>{config.label}</Badge>
      {config.next && (
        <button
          className="text-xs text-teal-600 hover:underline disabled:opacity-50"
          disabled={isPending}
          onClick={() => startTransition(() => updateAnoLetivoStatusAction(id, config.next!))}
        >
          {config.nextLabel}
        </button>
      )}
    </div>
  );
}
