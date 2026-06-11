"use client";

import { useState, useTransition } from "react";
import { Button, Input, toast } from "@nexora/ui";
import { Plus, Trash2, Globe, Star } from "lucide-react";
import { addDomainAction, removeDomainAction } from "@/actions/domains";
import { useConfirm } from "@/hooks/use-confirm";

interface Domain { id: string; domain: string; isPrimary: boolean }

export function DomainsManager({ initial }: { initial: Domain[] }) {
  const [domains, setDomains] = useState<Domain[]>(initial);
  const [value, setValue] = useState("");
  const [primary, setPrimary] = useState(initial.length === 0);
  const [isPending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();

  function add() {
    if (!value.trim()) return;
    const fd = new FormData();
    fd.set("domain", value.trim());
    fd.set("isPrimary", String(primary));
    startTransition(async () => {
      const r = await addDomainAction(fd);
      if ("error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      toast({ title: "Domínio adicionado" });
      setValue("");
      window.location.reload();
    });
  }

  async function remove(id: string, domain: string) {
    const ok = await confirm({
      title: `Remover ${domain}?`,
      description: "As páginas públicas deixarão de ser servidas por este domínio.",
      confirmVariant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      await removeDomainAction(id);
      setDomains((prev) => prev.filter((d) => d.id !== id));
    });
  }

  return (
    <div className="space-y-4 max-w-xl">
      <ConfirmDialog />

      <div className="rounded-lg border border-navy-100 bg-white p-4 space-y-3">
        <p className="text-sm font-semibold text-navy-900">Adicionar domínio</p>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="cursos.suaescola.com.br"
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <label className="flex items-center gap-2 text-sm text-navy-600">
          <input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} />
          Definir como domínio principal
        </label>
        <Button onClick={add} disabled={isPending || !value.trim()} className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
        <p className="text-xs text-navy-400">
          Aponte o DNS deste domínio para o app. As páginas publicadas no Page Builder
          ficarão acessíveis em <code className="bg-navy-50 px-1 rounded">https://{value.trim() || "seu-dominio"}/p/home</code> sem exigir login.
        </p>
      </div>

      {domains.length > 0 && (
        <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
          {domains.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-teal-500" aria-hidden="true" />
                <span className="font-mono text-sm text-navy-800">{d.domain}</span>
                {d.isPrimary && (
                  <span className="flex items-center gap-1 rounded bg-teal-50 px-1.5 py-0.5 text-xs text-teal-700">
                    <Star className="h-3 w-3" /> Principal
                  </span>
                )}
              </div>
              <button
                onClick={() => remove(d.id, d.domain)}
                disabled={isPending}
                className="p-1 text-navy-300 hover:text-red-500"
                aria-label={`Remover ${d.domain}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
