"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Badge } from "@nexora/ui";
import { useConfirm } from "@/hooks/use-confirm";
import { updateEnrollmentStatusAction } from "@/actions/secretaria";
import { UserCircle, Phone, ChevronRight } from "lucide-react";

type Status = "ATIVA" | "TRANSFERIDA" | "CANCELADA" | "CONCLUIDA";

const STATUS_BADGE: Record<Status, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  ATIVA:       { label: "Ativa",       variant: "default" },
  TRANSFERIDA: { label: "Transferida", variant: "secondary" },
  CANCELADA:   { label: "Cancelada",   variant: "destructive" },
  CONCLUIDA:   { label: "Concluída",   variant: "outline" },
};

interface Props {
  enrollmentId: string;
  studentId: string;
  name: string;
  email: string;
  phone: string | null;
  status: Status;
}

export function TurmaStudentRow({ enrollmentId, studentId, name, email, phone, status }: Props) {
  const [isPending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();

  async function handleCancel() {
    const ok = await confirm({
      description: `Cancelar matrícula de ${name}? O aluno perderá o vínculo com esta turma.`,
      confirmLabel: "Cancelar matrícula",
      confirmVariant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => { await updateEnrollmentStatusAction(enrollmentId, "CANCELADA"); });
  }

  const cfg = STATUS_BADGE[status];

  return (
    <>
      <ConfirmDialog />
      <div className="flex items-center gap-3 px-4 py-3">
        <UserCircle className="h-8 w-8 text-navy-200 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-navy-900">{name}</p>
          <p className="text-xs text-navy-400 truncate">{email}</p>
          {phone && (
            <p className="text-xs text-navy-400 flex items-center gap-1">
              <Phone className="h-3 w-3" /> {phone}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={cfg.variant}>{cfg.label}</Badge>
          {status === "ATIVA" && (
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="text-xs text-red-500 hover:underline disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
          <Link href={`/admin/secretaria/alunos/${studentId}` as never} className="text-navy-300 hover:text-navy-700">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
