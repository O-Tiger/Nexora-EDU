"use client";

import { useState, useTransition } from "react";
import {
  Button,
  Input,
  Textarea,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast,
} from "@nexora/ui";
import { Plus, Trash2, Save } from "lucide-react";
import type { QuestionType } from "@nexora/validators";
import { saveQuestionsAction } from "@/actions/assessments";

interface EditorQuestion {
  key: string;
  type: QuestionType;
  prompt: string;
  points: number;
  options: { id: string; text: string }[];
  correctAnswer: string | boolean | undefined;
}

interface InitialQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  options: unknown;
  correctAnswer: unknown;
}

interface Props {
  assessmentId: string;
  courseId: string;
  initialQuestions: InitialQuestion[];
}

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function normalize(q: InitialQuestion): EditorQuestion {
  const options = Array.isArray(q.options)
    ? (q.options as { id: string; text: string }[])
    : [];
  return {
    key: q.id,
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    options,
    correctAnswer:
      typeof q.correctAnswer === "string" || typeof q.correctAnswer === "boolean"
        ? q.correctAnswer
        : undefined,
  };
}

function blank(type: QuestionType): EditorQuestion {
  return {
    key: uid(),
    type,
    prompt: "",
    points: 1,
    options: type === "MULTIPLE_CHOICE" ? [{ id: uid(), text: "" }, { id: uid(), text: "" }] : [],
    correctAnswer: type === "TRUE_FALSE" ? true : undefined,
  };
}

export function QuestionEditor({ assessmentId, courseId, initialQuestions }: Props) {
  const [questions, setQuestions] = useState<EditorQuestion[]>(initialQuestions.map(normalize));
  const [isPending, startTransition] = useTransition();

  function update(key: string, patch: Partial<EditorQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }

  function changeType(key: string, type: QuestionType) {
    setQuestions((prev) => prev.map((q) => (q.key === key ? { ...blank(type), key, prompt: q.prompt, points: q.points } : q)));
  }

  function save() {
    const payload = questions.map((q) => {
      if (q.type === "MULTIPLE_CHOICE") {
        return { type: q.type, prompt: q.prompt, points: q.points, position: 0, options: q.options, correctAnswer: q.correctAnswer };
      }
      if (q.type === "TRUE_FALSE") {
        return { type: q.type, prompt: q.prompt, points: q.points, position: 0, correctAnswer: q.correctAnswer };
      }
      return { type: q.type, prompt: q.prompt, points: q.points, position: 0 };
    });

    startTransition(async () => {
      const r = await saveQuestionsAction(assessmentId, courseId, payload);
      if (r?.error) {
        toast({ variant: "destructive", title: "Erro ao salvar", description: r.error });
        return;
      }
      toast({ title: "Questões salvas" });
    });
  }

  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={q.key} className="rounded-lg border border-navy-100 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-medium text-navy-500">Questão {i + 1}</span>
            <div className="ml-auto flex items-center gap-2">
              <Select value={q.type} onValueChange={(v) => changeType(q.key, v as QuestionType)}>
                <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MULTIPLE_CHOICE">Múltipla escolha</SelectItem>
                  <SelectItem value="TRUE_FALSE">Verdadeiro/Falso</SelectItem>
                  <SelectItem value="ESSAY">Dissertativa</SelectItem>
                </SelectContent>
              </Select>
              <button onClick={() => setQuestions((p) => p.filter((x) => x.key !== q.key))} className="p-1 text-navy-300 hover:text-red-500" aria-label="Remover questão">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-navy-500">Enunciado</Label>
              <Textarea rows={2} value={q.prompt} maxLength={5000} onChange={(e) => update(q.key, { prompt: e.target.value })} />
            </div>

            {q.type === "MULTIPLE_CHOICE" && (
              <div className="space-y-2">
                <Label className="text-xs text-navy-500">Alternativas (marque a correta)</Label>
                {q.options.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${q.key}`}
                      checked={q.correctAnswer === opt.id}
                      onChange={() => update(q.key, { correctAnswer: opt.id })}
                      className="h-4 w-4 accent-teal-600"
                    />
                    <Input
                      value={opt.text}
                      placeholder="Texto da alternativa"
                      maxLength={1000}
                      onChange={(e) =>
                        update(q.key, { options: q.options.map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o)) })
                      }
                    />
                    <button
                      onClick={() => update(q.key, { options: q.options.filter((o) => o.id !== opt.id) })}
                      disabled={q.options.length <= 2}
                      className="text-navy-300 hover:text-red-500 disabled:opacity-30"
                      aria-label="Remover alternativa"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <Button variant="secondary" size="sm" disabled={q.options.length >= 10} onClick={() => update(q.key, { options: [...q.options, { id: uid(), text: "" }] })}>
                  <Plus className="h-3.5 w-3.5" /> Alternativa
                </Button>
              </div>
            )}

            {q.type === "TRUE_FALSE" && (
              <div className="space-y-1">
                <Label className="text-xs text-navy-500">Resposta correta</Label>
                <Select value={String(q.correctAnswer)} onValueChange={(v) => update(q.key, { correctAnswer: v === "true" })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Verdadeiro</SelectItem>
                    <SelectItem value="false">Falso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {q.type === "ESSAY" && (
              <p className="text-xs text-navy-400">Questão dissertativa — correção manual pelo professor.</p>
            )}

            <div className="space-y-1">
              <Label className="text-xs text-navy-500">Pontos</Label>
              <Input type="number" min={0} step={0.5} value={q.points} className="w-28" onChange={(e) => update(q.key, { points: Math.max(0, Number(e.target.value) || 0) })} />
            </div>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => setQuestions((p) => [...p, blank("MULTIPLE_CHOICE")])}>
          <Plus className="h-4 w-4" /> Adicionar questão
        </Button>
        <Button size="sm" onClick={save} disabled={isPending || questions.length === 0} className="ml-auto">
          <Save className="h-4 w-4" /> Salvar questões
        </Button>
      </div>
    </div>
  );
}
