"use client";

import { useTransition } from "react";
import { Badge } from "@nexora/ui";
import { Mail, Phone, Trash2 } from "lucide-react";
import { deleteGuardianAction } from "@/actions/secretaria";
import { useConfirm } from "@/hooks/use-confirm";

interface Props {
  id: string;
  studentId: string;
  name: string;
  relationship: string;
  email?: string | null;
  phone?: string | null;
  isPrimary: boolean;
}

export function GuardianRow({ id, studentId, name, relationship, email, phone, isPrimary }: Props) {
  const [isPending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();

  async function handleDelete() {
    const ok = await confirm({ description: `Remover ${name} como responsável?`, confirmVariant: "destructive" });
    if (!ok) return;
    startTransition(async () => { await deleteGuardianAction(id, studentId); });
  }

  return (
    <>
      <ConfirmDialog />
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-navy-900">{name}</p>
            <span className="text-xs text-navy-500">{relationship}</span>
            {isPrimary && <Badge variant="secondary" className="text-xs">Principal</Badge>}
          </div>
          <div className="flex items-center gap-4 mt-0.5">
            {email && (
              <span className="flex items-center gap-1 text-xs text-navy-400">
                <Mail className="h-3 w-3" /> {email}
              </span>
            )}
            {phone && (
              <span className="flex items-center gap-1 text-xs text-navy-400">
                <Phone className="h-3 w-3" /> {phone}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="p-1 text-navy-300 hover:text-red-500 disabled:opacity-50"
          aria-label="Remover responsável"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
