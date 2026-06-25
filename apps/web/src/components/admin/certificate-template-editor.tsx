"use client";

import { useState, useTransition } from "react";
import { Button, Input, Textarea, Label, toast } from "@nexora/ui";
import { Plus, Trash2, Save, Eye, Download } from "lucide-react";
import { upsertCertificateTemplateAction } from "@/actions/certificate-template";

interface Signature { name: string; role: string; document?: string }
interface Template {
  institutionName: string;
  subtitle: string;
  title: string;
  bodyTemplate: string;
  signatures: Signature[];
  logoUrl: string;
  city: string;
  accentColor: string;
}

const PLACEHOLDERS = ["name", "course", "hours", "date", "cpf", "code", "city"];

export function CertificateTemplateEditor({ initial }: { initial: Template }) {
  const [t, setT] = useState<Template>(initial);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof Template>(key: K, value: Template[K]) {
    setT((prev) => ({ ...prev, [key]: value }));
  }

  function updateSig(i: number, patch: Partial<Signature>) {
    setT((prev) => ({ ...prev, signatures: prev.signatures.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
  }

  function save(then?: "preview" | "pdf") {
    startTransition(async () => {
      const r = await upsertCertificateTemplateAction({
        ...t,
        subtitle: t.subtitle || undefined,
        logoUrl: t.logoUrl || "",
        city: t.city || undefined,
      });
      if ("error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      toast({ title: "Template salvo" });
      if (then === "preview") window.open("/api/admin/certificado-preview?format=html", "_blank", "noopener");
      if (then === "pdf") {
        const a = document.createElement("a");
        a.href = "/api/admin/certificado-preview?format=pdf";
        a.download = "";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    });
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Nome da instituição</Label>
          <Input value={t.institutionName} onChange={(e) => set("institutionName", e.target.value)} maxLength={160} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Subtítulo / credenciamento (opcional)</Label>
          <Textarea value={t.subtitle} onChange={(e) => set("subtitle", e.target.value)} rows={2} maxLength={400} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Título</Label>
          <Input value={t.title} onChange={(e) => set("title", e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Cidade</Label>
          <Input value={t.city} onChange={(e) => set("city", e.target.value)} maxLength={80} placeholder="São Paulo" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">URL do logo (opcional)</Label>
          <Input value={t.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Cor de destaque</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={t.accentColor} onChange={(e) => set("accentColor", e.target.value)} className="h-9 w-12 rounded border border-navy-200" />
            <Input value={t.accentColor} onChange={(e) => set("accentColor", e.target.value)} className="font-mono" maxLength={7} />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">
          Corpo do certificado · placeholders:{" "}
          {PLACEHOLDERS.map((p) => <code key={p} className="mx-0.5 rounded bg-navy-50 px-1 text-navy-700">{`{{${p}}}`}</code>)}
        </Label>
        <Textarea value={t.bodyTemplate} onChange={(e) => set("bodyTemplate", e.target.value)} rows={4} maxLength={2000} className="text-sm" />
        <p className="text-xs text-navy-400">HTML básico permitido (ex: &lt;strong&gt;). {`{{cpf}}`} já inclui o prefixo &ldquo;CPF&rdquo; quando preenchido.</p>
      </div>

      {/* Assinaturas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Assinaturas ({t.signatures.length}/4)</Label>
          {t.signatures.length < 4 && (
            <button
              onClick={() => set("signatures", [...t.signatures, { name: "", role: "" }])}
              className="flex items-center gap-1 text-xs text-teal-600 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </button>
          )}
        </div>
        {t.signatures.map((s, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-lg border border-navy-100 p-3">
            <Input value={s.name} onChange={(e) => updateSig(i, { name: e.target.value })} placeholder="Nome" className="text-sm" />
            <Input value={s.role} onChange={(e) => updateSig(i, { role: e.target.value })} placeholder="Cargo" className="text-sm" />
            <div className="flex gap-2">
              <Input value={s.document ?? ""} onChange={(e) => updateSig(i, { document: e.target.value })} placeholder="RG/Doc (opcional)" className="text-sm" />
              <button
                onClick={() => set("signatures", t.signatures.filter((_, idx) => idx !== i))}
                className="p-1 text-navy-300 hover:text-red-500 shrink-0"
                aria-label="Remover assinatura"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-navy-100">
        <Button onClick={() => save()} disabled={isPending} className="gap-2">
          <Save className="h-4 w-4" /> Salvar
        </Button>
        <Button variant="outline" onClick={() => save("preview")} disabled={isPending} className="gap-2">
          <Eye className="h-4 w-4" /> Salvar e visualizar
        </Button>
        <Button variant="outline" onClick={() => save("pdf")} disabled={isPending} className="gap-2">
          <Download className="h-4 w-4" /> Salvar e baixar PDF de exemplo
        </Button>
      </div>
    </div>
  );
}
