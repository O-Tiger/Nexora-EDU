"use client";

import { Textarea, Label } from "@nexora/ui";
import type { QuestionType, QuestionOption } from "@nexora/validators";

export interface StudentQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  options?: unknown;
}

export type AnswerValue = string | boolean | undefined;

interface Props {
  question: StudentQuestion;
  index: number;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  disabled?: boolean;
}

function asOptions(raw: unknown): QuestionOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (o): o is QuestionOption =>
      !!o && typeof o === "object" && typeof (o as QuestionOption).id === "string",
  );
}

/** Renderiza qualquer tipo de questão como input controlado para o aluno. */
export function QuestionRenderer({ question, index, value, onChange, disabled }: Props) {
  return (
    <div className="rounded-lg border border-navy-100 bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="font-medium text-navy-900">
          <span className="mr-1.5 text-navy-400">{index + 1}.</span>
          {question.prompt}
        </p>
        <span className="shrink-0 text-xs text-navy-400">
          {question.points} pt{question.points !== 1 ? "s" : ""}
        </span>
      </div>

      {question.type === "MULTIPLE_CHOICE" && (
        <div className="space-y-1.5">
          {asOptions(question.options).map((opt) => (
            <label
              key={opt.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-navy-700 hover:bg-navy-50"
            >
              <input
                type="radio"
                name={question.id}
                value={opt.id}
                checked={value === opt.id}
                onChange={() => onChange(opt.id)}
                disabled={disabled}
                className="h-4 w-4 accent-teal-600"
              />
              {opt.text}
            </label>
          ))}
        </div>
      )}

      {question.type === "TRUE_FALSE" && (
        <div className="flex gap-4">
          {[
            { label: "Verdadeiro", val: true },
            { label: "Falso", val: false },
          ].map((o) => (
            <label key={o.label} className="flex cursor-pointer items-center gap-2 text-sm text-navy-700">
              <input
                type="radio"
                name={question.id}
                checked={value === o.val}
                onChange={() => onChange(o.val)}
                disabled={disabled}
                className="h-4 w-4 accent-teal-600"
              />
              {o.label}
            </label>
          ))}
        </div>
      )}

      {question.type === "ESSAY" && (
        <div className="space-y-1">
          <Label className="text-xs text-navy-500">Sua resposta</Label>
          <Textarea
            rows={4}
            maxLength={20000}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="Digite sua resposta..."
          />
        </div>
      )}
    </div>
  );
}
