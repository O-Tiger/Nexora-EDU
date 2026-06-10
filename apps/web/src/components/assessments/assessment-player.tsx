"use client";

import { useState, useTransition } from "react";
import { Button, toast } from "@nexora/ui";
import { CheckCircle2, Clock } from "lucide-react";
import { QuestionRenderer, type StudentQuestion, type AnswerValue } from "./question-renderer";
import { FileUploadZone, type UploadedFile } from "@/components/shared/file-upload-zone";
import { submitAssessmentAction } from "@/actions/assessments";
import { useConfirm } from "@/hooks/use-confirm";

interface Props {
  assessmentId: string;
  title: string;
  description: string | null;
  questions: StudentQuestion[];
  attemptsUsed: number;
  maxAttempts: number;
  allowFiles?: boolean;
}

type Result = { needsManual: boolean; score: number | null };

export function AssessmentPlayer({
  assessmentId,
  title,
  description,
  questions,
  attemptsUsed,
  maxAttempts,
  allowFiles,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [isPending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();

  const remaining = maxAttempts - attemptsUsed;
  const totalPoints = questions.reduce((s, q) => s + q.points, 0);

  async function submit() {
    const unanswered = questions.filter((q) => answers[q.id] === undefined || answers[q.id] === "");
    if (unanswered.length > 0 && !await confirm({ title: "Enviar avaliação", description: `${unanswered.length} questão(ões) sem resposta. Enviar mesmo assim?`, confirmLabel: "Enviar" })) {
      return;
    }

    startTransition(async () => {
      const r = await submitAssessmentAction(assessmentId, answers, files.map((f) => f.fileKey));
      if (r?.error) {
        toast({ variant: "destructive", title: "Erro", description: r.error });
        return;
      }
      setResult({ needsManual: r.needsManual ?? false, score: r.score ?? null });
    });
  }

  if (result) {
    return (
      <div className="rounded-lg border border-navy-100 bg-white p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-teal-500" />
        <h2 className="mt-4 text-xl font-bold text-navy-900">Avaliação enviada</h2>
        {result.needsManual ? (
          <p className="mt-2 text-navy-600">
            Há questões dissertativas — sua nota final será divulgada após a correção do professor.
          </p>
        ) : (
          <p className="mt-2 text-navy-600">
            Nota automática: <strong className="text-navy-900">{result.score}</strong> de {totalPoints}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ConfirmDialog />
      <div className="rounded-lg border border-navy-100 bg-white p-5">
        <h1 className="text-xl font-bold text-navy-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-navy-600">{description}</p>}
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-navy-400">
          <span>{questions.length} questões · {totalPoints} pontos</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Tentativa {attemptsUsed + 1} de {maxAttempts}
          </span>
        </div>
      </div>

      {remaining <= 0 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Você atingiu o limite de tentativas desta avaliação.
        </p>
      ) : (
        <>
          {questions.map((q, i) => (
            <QuestionRenderer
              key={q.id}
              question={q}
              index={i}
              value={answers[q.id]}
              onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
              disabled={isPending}
            />
          ))}

          {allowFiles && (
            <div className="rounded-lg border border-navy-100 bg-white p-4">
              <p className="mb-2 text-sm font-medium text-navy-800">Anexar arquivos (opcional)</p>
              <FileUploadZone value={files} onChange={setFiles} disabled={isPending} />
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={submit} disabled={isPending}>
              Enviar avaliação
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
