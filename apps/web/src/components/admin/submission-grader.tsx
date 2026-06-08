"use client";

import { useState, useTransition } from "react";
import { Button, Input, toast } from "@nexora/ui";
import { Check } from "lucide-react";
import { gradeSubmissionAction } from "@/actions/assessments";

interface QA {
  prompt: string;
  answer: string;
}

interface PendingSubmission {
  id: string;
  attempt: number;
  autoScore: number | null;
  essayAnswers: QA[];
}

interface Props {
  courseId: string;
  totalPoints: number;
  submissions: PendingSubmission[];
}

export function SubmissionGrader({ courseId, totalPoints, submissions }: Props) {
  const [items, setItems] = useState(submissions);

  if (items.length === 0) {
    return <p className="text-sm text-navy-400">Nenhuma submissão pendente de correção.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((s) => (
        <SubmissionRow
          key={s.id}
          courseId={courseId}
          totalPoints={totalPoints}
          submission={s}
          onGraded={() => setItems((prev) => prev.filter((x) => x.id !== s.id))}
        />
      ))}
    </div>
  );
}

function SubmissionRow({
  courseId,
  totalPoints,
  submission,
  onGraded,
}: {
  courseId: string;
  totalPoints: number;
  submission: PendingSubmission;
  onGraded: () => void;
}) {
  const [score, setScore] = useState(String(submission.autoScore ?? 0));
  const [isPending, startTransition] = useTransition();

  function grade() {
    const n = Number(score);
    if (!Number.isFinite(n) || n < 0) {
      toast({ variant: "destructive", title: "Nota inválida" });
      return;
    }
    startTransition(async () => {
      const r = await gradeSubmissionAction(submission.id, courseId, n);
      if (r?.error) {
        toast({ variant: "destructive", title: "Erro", description: r.error });
        return;
      }
      toast({ title: "Submissão corrigida" });
      onGraded();
    });
  }

  return (
    <div className="rounded-lg border border-navy-100 bg-white p-4">
      <p className="mb-2 text-xs text-navy-400">
        Tentativa {submission.attempt} · nota automática (objetivas): {submission.autoScore ?? 0}
      </p>
      <div className="space-y-2">
        {submission.essayAnswers.map((qa, i) => (
          <div key={i} className="rounded-md bg-navy-50 p-3 text-sm">
            <p className="font-medium text-navy-800">{qa.prompt}</p>
            <p className="mt-1 whitespace-pre-wrap text-navy-600">{qa.answer || <em className="text-navy-400">Sem resposta</em>}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-navy-500">Nota final (de {totalPoints}):</span>
        <Input type="number" min={0} step={0.5} value={score} className="w-28" onChange={(e) => setScore(e.target.value)} />
        <Button size="sm" onClick={grade} disabled={isPending}>
          <Check className="h-4 w-4" /> Lançar nota
        </Button>
      </div>
    </div>
  );
}
