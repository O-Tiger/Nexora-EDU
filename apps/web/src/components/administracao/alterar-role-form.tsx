"use client";

import { useTransition } from "react";
import { toast } from "@nexora/ui";
import { alterarRoleAction } from "@/actions/administracao";
import type { Role } from "@nexora/db";

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "ADMINISTRATOR", label: "Administrador" },
  { value: "TI_SUPPORT",    label: "Suporte TI" },
  { value: "ASSISTANT",     label: "Coordenador" },
  { value: "PROFESSOR",     label: "Professor" },
];

type Props = { membershipId: string; currentRole: Role };

export function AlterarRoleForm({ membershipId, currentRole }: Props) {
  const [isPending, startTransition] = useTransition();

  function submit(fd: FormData) {
    startTransition(async () => {
      const r = await alterarRoleAction(fd);
      if ("error" in r) {
        toast({ variant: "destructive", title: "Erro", description: r.error });
      } else {
        toast({ title: "Permissão atualizada" });
      }
    });
  }

  return (
    <form action={submit} className="flex items-center gap-1">
      <input type="hidden" name="membershipId" value={membershipId} />
      <select
        name="role"
        defaultValue={currentRole}
        disabled={isPending}
        className="rounded border border-navy-200 px-2 py-1 text-xs text-navy-700 focus:outline-none focus:ring-1 focus:ring-teal-400"
        onChange={(e) => {
          const fd = new FormData();
          fd.set("membershipId", membershipId);
          fd.set("role", e.target.value);
          startTransition(async () => {
            const r = await alterarRoleAction(fd);
            if ("error" in r) {
              toast({ variant: "destructive", title: "Erro", description: r.error });
            } else {
              toast({ title: "Permissão atualizada" });
            }
          });
        }}
      >
        {ROLE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </form>
  );
}
