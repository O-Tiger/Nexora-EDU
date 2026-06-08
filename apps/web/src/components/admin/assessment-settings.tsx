"use client";

import { useState, useTransition } from "react";
import { Button, Input, Textarea, Label, toast } from "@nexora/ui";
import { Save, Rocket } from "lucide-react";
import { updateAssessmentAction, publishAssessmentAction } from "@/actions/assessments";

interface Props {
  assessmentId: string;
  courseId: string;
  initial: {
    title: string;
    description: string;
    passingScore: number;
    maxAttempts: number;
    formulaVar: string;
    status: string;
  };
}

export function AssessmentSettings({ assessmentId, courseId, initial }: Props) {
  const [form, setForm] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function set(patch: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function save() {
    startTransition(async () => {
      const r = await updateAssessmentAction(assessmentId, courseId, {
        title: form.title,
        description: form.description || undefined,
        passingScore: form.passingScore,
        maxAttempts: form.maxAttempts,
        formulaVar: form.formulaVar || undefined,
      });
      if (r?.error) {
        toast({ variant: "destructive", title: "Erro", description: r.error });
        return;
      }
      toast({ title: "Configurações salvas" });
    });
  }

  function publish() {
    startTransition(async () => {
      const r = await publishAssessmentAction(assessmentId, courseId);
      if (r?.error) {
        toast({ variant: "destructive", title: "Erro", description: r.error });
        return;
      }
      set({ status: "PUBLISHED" });
      toast({ title: "Avaliação publicada" });
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-navy-100 bg-white p-4">
      <div className="space-y-1">
        <Label className="text-xs text-navy-500">Título</Label>
        <Input value={form.title} maxLength={200} onChange={(e) => set({ title: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-navy-500">Descrição</Label>
        <Textarea rows={2} value={form.description} maxLength={2000} onChange={(e) => set({ description: e.target.value })} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-navy-500">Nota mínima</Label>
          <Input type="number" min={0} step={0.5} value={form.passingScore} onChange={(e) => set({ passingScore: Math.max(0, Number(e.target.value) || 0) })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-navy-500">Tentativas</Label>
          <Input type="number" min={1} max={10} value={form.maxAttempts} onChange={(e) => set({ maxAttempts: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-navy-500">Variável (fórmula)</Label>
          <Input value={form.formulaVar} placeholder="p1" maxLength={20} onChange={(e) => set({ formulaVar: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={save} disabled={isPending}>
          <Save className="h-4 w-4" /> Salvar
        </Button>
        {form.status !== "PUBLISHED" && (
          <Button size="sm" onClick={publish} disabled={isPending}>
            <Rocket className="h-4 w-4" /> Publicar
          </Button>
        )}
      </div>
    </div>
  );
}
