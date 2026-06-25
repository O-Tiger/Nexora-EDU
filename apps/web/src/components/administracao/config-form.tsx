"use client";

import { useTransition, useRef, useState } from "react";
import { Button, toast } from "@nexora/ui";
import { salvarConfigAction, uploadLogoAction } from "@/actions/administracao";
import { Upload, ImageIcon } from "lucide-react";
import Image from "next/image";

type Config = {
  schoolName?: string | null;
  schoolAddress?: string | null;
  cnpj?: string | null;
  logoUrl?: string | null;
  emailDomain?: string | null;
  emailTemplate?: string | null;
} | null;

type Props = { tenantId: string; config: Config; emailPreview: string | null };

export function ConfigForm({ tenantId, config, emailPreview }: Props) {
  const [isPending, startTransition] = useTransition();
  const [logoUrl, setLogoUrl] = useState(config?.logoUrl ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  function submit(fd: FormData) {
    fd.set("tenantId", tenantId);
    startTransition(async () => {
      const r = await salvarConfigAction(fd);
      if ("error" in r) {
        toast({ variant: "destructive", title: "Erro", description: r.error });
      } else {
        toast({ title: "Configurações salvas" });
      }
    });
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("logo", file);
    startTransition(async () => {
      const r = await uploadLogoAction(fd);
      if ("error" in r) {
        toast({ variant: "destructive", title: "Erro no upload", description: r.error });
      } else {
        setLogoUrl(r.logoUrl + "?t=" + Date.now());
        toast({ title: "Logo atualizado" });
      }
    });
  }

  return (
    <form action={submit} className="space-y-6">
      {/* Logo */}
      <section className="rounded-xl border border-navy-100 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-navy-700">Logo da instituição</h2>
        <div className="flex items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-navy-200 bg-navy-50 overflow-hidden shrink-0">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo da instituição"
                width={80}
                height={80}
                className="object-contain w-full h-full"
                unoptimized
              />
            ) : (
              <ImageIcon className="h-8 w-8 text-navy-300" />
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs text-navy-500">PNG, JPEG ou WebP · máx. 2MB</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50 transition-colors disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {logoUrl ? "Trocar logo" : "Fazer upload"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>
        </div>
      </section>

      {/* Dados da instituição */}
      <section className="rounded-xl border border-navy-100 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-navy-700">Dados da instituição</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">Nome oficial</label>
            <input name="schoolName" defaultValue={config?.schoolName ?? ""} placeholder="Ex: Colégio Caminhos e Colinas"
              className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">CNPJ</label>
            <input name="cnpj" defaultValue={config?.cnpj ?? ""} placeholder="00.000.000/0000-00"
              className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-navy-600 mb-1">Endereço</label>
            <input name="schoolAddress" defaultValue={config?.schoolAddress ?? ""} placeholder="Rua, número, cidade — UF"
              className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
        </div>
      </section>

      {/* Email institucional */}
      <section className="rounded-xl border border-navy-100 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-navy-700">Email institucional</h2>
        <p className="text-xs text-navy-500">
          Formato usado para gerar emails dos responsáveis. Placeholders disponíveis:{" "}
          <code className="bg-navy-50 px-1 rounded">{"{primeiroNome}"}</code>{" "}
          <code className="bg-navy-50 px-1 rounded">{"{primeiroSobrenome}"}</code>{" "}
          <code className="bg-navy-50 px-1 rounded">{"{nomeCompleto}"}</code>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">Domínio</label>
            <input name="emailDomain" defaultValue={config?.emailDomain ?? ""} placeholder="caminhosecolinas.org.br"
              className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">Template (parte local)</label>
            <input name="emailTemplate" defaultValue={config?.emailTemplate ?? ""} placeholder="{primeiroNome}.{primeiroSobrenome}"
              className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
        </div>
        {emailPreview && (
          <div className="rounded-lg bg-teal-50 border border-teal-200 px-3 py-2">
            <p className="text-xs text-teal-600">
              Preview (João Silva): <span className="font-mono font-semibold">{emailPreview}</span>
            </p>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </form>
  );
}
