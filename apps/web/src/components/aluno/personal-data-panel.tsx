"use client";

import { useState, useTransition } from "react";
import { Button } from "@nexora/ui";
import { Download, Trash2, ShieldCheck, User, Mail, Phone, CreditCard, Clock } from "lucide-react";
import { requestDataExportAction, requestAccountDeletionAction } from "@/actions/lgpd";
import { useConfirm } from "@/hooks/use-confirm";

interface Props {
  user: {
    name: string;
    email: string;
    cpf: string | null;
    phone: string | null;
    consentedAt: string | null;
    memberSince: string;
  };
  pendingExport: { id: string; expiresAt: string } | null;
}

export function PersonalDataPanel({ user, pendingExport }: Props) {
  const [exportState, setExportState] = useState<
    | { phase: "idle" }
    | { phase: "generating" }
    | { phase: "ready"; url: string; expiresAt: string }
    | { phase: "error"; message: string }
  >(
    pendingExport
      ? { phase: "ready", url: "", expiresAt: pendingExport.expiresAt } // URL fetched on demand
      : { phase: "idle" },
  );
  const [isPending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();

  async function handleExport() {
    setExportState({ phase: "generating" });
    startTransition(async () => {
      const result = await requestDataExportAction();
      if ("error" in result) {
        setExportState({ phase: "error", message: result.error });
        return;
      }

      // Trigger actual generation via API route
      try {
        const res = await fetch("/api/meus-dados/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exportId: result.exportId }),
        });
        const data = await res.json() as { url?: string; expiresAt?: string; error?: string };
        if (!res.ok || !data.url) {
          setExportState({ phase: "error", message: data.error ?? "Falha ao gerar exportação." });
          return;
        }
        setExportState({ phase: "ready", url: data.url, expiresAt: data.expiresAt ?? "" });
      } catch {
        setExportState({ phase: "error", message: "Erro de conexão. Tente novamente." });
      }
    });
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Excluir conta permanentemente?",
      description: "Seus dados pessoais serão anonimizados imediatamente. Esta ação é irreversível.",
      confirmLabel: "Excluir minha conta",
      confirmVariant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      await requestAccountDeletionAction();
    });
  }

  const fields = [
    { icon: User, label: "Nome", value: user.name },
    { icon: Mail, label: "E-mail", value: user.email },
    { icon: CreditCard, label: "CPF", value: user.cpf ?? "Não informado" },
    { icon: Phone, label: "Telefone", value: user.phone ?? "Não informado" },
    {
      icon: Clock,
      label: "Membro desde",
      value: new Date(user.memberSince).toLocaleDateString("pt-BR"),
    },
    {
      icon: ShieldCheck,
      label: "Consentimento LGPD",
      value: user.consentedAt
        ? `Aceito em ${new Date(user.consentedAt).toLocaleDateString("pt-BR")}`
        : "Pendente",
    },
  ];

  return (
    <>
      <ConfirmDialog />

      {/* Personal data card */}
      <section className="rounded-lg border border-navy-100 bg-white">
        <div className="border-b border-navy-100 px-4 py-3">
          <p className="text-sm font-semibold text-navy-900">Dados pessoais</p>
        </div>
        <ul className="divide-y divide-navy-50">
          {fields.map(({ icon: Icon, label, value }) => (
            <li key={label} className="flex items-center gap-3 px-4 py-3">
              <Icon className="h-4 w-4 shrink-0 text-navy-300" />
              <span className="w-32 shrink-0 text-xs font-medium text-navy-500">{label}</span>
              <span className="text-sm text-navy-800">{value}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Export */}
      <section className="rounded-lg border border-navy-100 bg-white p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-navy-900">Exportar meus dados</p>
          <p className="mt-0.5 text-xs text-navy-500">
            Baixe um arquivo JSON com todos os seus dados pessoais, matrículas e histórico de atividades.
            O link expira em 24 horas.
          </p>
        </div>

        {exportState.phase === "idle" && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isPending}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Solicitar exportação
          </Button>
        )}

        {exportState.phase === "generating" && (
          <p className="text-sm text-navy-500">Gerando exportação, aguarde...</p>
        )}

        {exportState.phase === "ready" && (
          <div className="space-y-2">
            {exportState.url && exportState.url !== "" ? (
              <Button size="sm" className="gap-2" asChild>
                <a href={exportState.url} download="meus-dados.json">
                  <Download className="h-4 w-4" />
                  Baixar JSON
                </a>
              </Button>
            ) : (
              <p className="text-sm text-navy-500">Exportação já disponível abaixo.</p>
            )}
            {exportState.expiresAt && (
              <p className="text-xs text-navy-400">
                Link válido até {new Date(exportState.expiresAt).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        )}

        {exportState.phase === "error" && (
          <div className="space-y-2">
            <p className="text-sm text-red-600">{exportState.message}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportState({ phase: "idle" })}
            >
              Tentar novamente
            </Button>
          </div>
        )}
      </section>

      {/* Account deletion */}
      <section className="rounded-lg border border-red-100 bg-red-50 p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-red-800">Excluir minha conta</p>
          <p className="mt-0.5 text-xs text-red-600">
            Seus dados pessoais serão anonimizados imediatamente e de forma irreversível (LGPD art. 18).
            Registros de matrícula e certificados são mantidos para fins legais, mas desvinculados da sua identidade.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isPending}
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Excluir minha conta
        </Button>
      </section>
    </>
  );
}
