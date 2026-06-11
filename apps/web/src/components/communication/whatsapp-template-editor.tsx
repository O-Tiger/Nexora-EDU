"use client";

import { useState, useTransition } from "react";
import { Button, Textarea, Label, toast } from "@nexora/ui";
import { MessageCircle, Save, Eye, EyeOff } from "lucide-react";
import { upsertWhatsAppTemplateAction, toggleWhatsAppTemplateAction } from "@/actions/whatsapp-templates";

export const EVENT_LABELS: Record<string, string> = {
  "enrollment.created": "Matrícula criada",
  "enrollment.expiring": "Matrícula expirando",
  "enrollment.expired": "Matrícula expirada",
  "enrollment.reactivated": "Matrícula reativada",
  "certificate.issued": "Certificado emitido",
  "live.reminder": "Lembrete de aula ao vivo",
  "assessment.deadline": "Prazo de avaliação",
};

export const EVENT_PLACEHOLDERS: Record<string, string[]> = {
  "enrollment.created": ["name", "course"],
  "enrollment.expiring": ["name", "course", "date"],
  "enrollment.expired": ["name", "course"],
  "enrollment.reactivated": ["name", "course"],
  "certificate.issued": ["name", "course", "link"],
  "live.reminder": ["name", "lesson", "date", "time"],
  "assessment.deadline": ["name", "assessment", "date"],
};

interface Template {
  id: string;
  event: string;
  bodyTemplate: string;
  isActive: boolean;
}

interface Props {
  initial: Template[];
}

export function WhatsAppTemplateEditor({ initial }: Props) {
  const [templates, setTemplates] = useState<Map<string, Template>>(
    () => new Map(initial.map((t) => [t.event, t])),
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function startEdit(event: string) {
    const t = templates.get(event);
    setBody(t?.bodyTemplate ?? "");
    setEditing(event);
  }

  function save(event: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("event", event);
      fd.set("bodyTemplate", body);
      fd.set("isActive", String(templates.get(event)?.isActive ?? true));
      const r = await upsertWhatsAppTemplateAction(fd);
      if ("error" in r) {
        toast({ variant: "destructive", title: "Erro", description: r.error });
        return;
      }
      setTemplates((prev) => {
        const next = new Map(prev);
        const existing = next.get(event);
        next.set(event, { id: existing?.id ?? event, event, bodyTemplate: body, isActive: existing?.isActive ?? true });
        return next;
      });
      setEditing(null);
      toast({ title: "Template salvo" });
    });
  }

  function toggleActive(event: string) {
    const current = templates.get(event)?.isActive ?? false;
    startTransition(async () => {
      await toggleWhatsAppTemplateAction(event, !current);
      setTemplates((prev) => {
        const next = new Map(prev);
        const existing = next.get(event);
        if (existing) next.set(event, { ...existing, isActive: !current });
        return next;
      });
    });
  }

  const allEvents = Object.keys(EVENT_LABELS);

  return (
    <div className="space-y-3">
      {allEvents.map((event) => {
        const t = templates.get(event);
        const isEditingThis = editing === event;
        const placeholders = EVENT_PLACEHOLDERS[event] ?? [];

        return (
          <div key={event} className="rounded-lg border border-navy-100 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-navy-900">{EVENT_LABELS[event]}</p>
                  <p className="text-xs text-navy-400 font-mono">{event}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {t && (
                  <button
                    onClick={() => toggleActive(event)}
                    disabled={isPending}
                    className="text-navy-400 hover:text-navy-700 transition-colors"
                    title={t.isActive ? "Desativar" : "Ativar"}
                  >
                    {t.isActive
                      ? <Eye className="h-4 w-4 text-teal-500" />
                      : <EyeOff className="h-4 w-4" />
                    }
                  </button>
                )}
                <Button
                  size="sm"
                  variant={isEditingThis ? "default" : "outline"}
                  onClick={() => isEditingThis ? save(event) : startEdit(event)}
                  disabled={isPending}
                >
                  {isEditingThis ? (
                    <><Save className="h-3.5 w-3.5" /> Salvar</>
                  ) : (
                    t ? "Editar" : "Criar"
                  )}
                </Button>
                {isEditingThis && (
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)} disabled={isPending}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>

            {isEditingThis ? (
              <div className="mt-3 space-y-2">
                <Label className="text-xs text-navy-500">
                  Disponíveis: {placeholders.map((p) => (
                    <code key={p} className="mx-0.5 rounded bg-navy-50 px-1 text-navy-700">{`{{${p}}}`}</code>
                  ))}
                </Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder={`Olá {{name}}, sua matrícula em {{course}} foi confirmada!`}
                  className="text-sm font-mono"
                  maxLength={1000}
                />
                <p className="text-right text-xs text-navy-400">{body.length}/1000</p>
              </div>
            ) : t ? (
              <p className="mt-2 text-sm text-navy-600 line-clamp-2 font-mono bg-navy-50 rounded px-3 py-2">
                {t.bodyTemplate}
              </p>
            ) : (
              <p className="mt-2 text-xs text-navy-400 italic">Nenhum template configurado — mensagem não será enviada.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
