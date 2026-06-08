"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button, Input, Badge, toast } from "@nexora/ui";
import { Plus, Trash2, FileCheck2 } from "lucide-react";
import { createAssessmentAction, publishAssessmentAction, deleteAssessmentAction } from "@/actions/assessments";

interface Item {
  id: string;
  title: string;
  status: string;
  questions: number;
  submissions: number;
}

interface Props {
  courseId: string;
  initial: Item[];
}

const STATUS_LABEL: Record<string, string> = { DRAFT: "Rascunho", PUBLISHED: "Publicada", ARCHIVED: "Arquivada" };

export function AssessmentManager({ courseId, initial }: Props) {
  const [items, setItems] = useState(initial);
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  function create() {
    const t = title.trim();
    if (t.length < 3) return;
    startTransition(async () => {
      const r = await createAssessmentAction({ courseId, title: t });
      if ("error" in r) {
        toast({ variant: "destructive", title: "Erro", description: r.error });
        return;
      }
      setItems((prev) => [{ id: r.assessmentId!, title: t, status: "DRAFT", questions: 0, submissions: 0 }, ...prev]);
      setTitle("");
    });
  }

  function publish(id: string) {
    startTransition(async () => {
      const r = await publishAssessmentAction(id, courseId);
      if (r?.error) {
        toast({ variant: "destructive", title: "Erro", description: r.error });
        return;
      }
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "PUBLISHED" } : it)));
      toast({ title: "Avaliação publicada" });
    });
  }

  function remove(id: string) {
    if (!confirm("Excluir esta avaliação e suas questões/submissões?")) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
    startTransition(() => deleteAssessmentAction(id, courseId));
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Título da nova avaliação"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
        />
        <Button onClick={create} disabled={isPending || title.trim().length < 3} size="sm">
          <Plus className="h-4 w-4" /> Criar
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-navy-200 py-8 text-center text-sm text-navy-400">
          Nenhuma avaliação ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 rounded-lg border border-navy-100 bg-white p-3">
              <FileCheck2 className="h-4 w-4 shrink-0 text-navy-400" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-navy-900">{it.title}</p>
                <p className="text-xs text-navy-400">{it.questions} questões · {it.submissions} envios</p>
              </div>
              <Badge variant={it.status === "PUBLISHED" ? "default" : "secondary"} className="shrink-0">
                {STATUS_LABEL[it.status] ?? it.status}
              </Badge>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/admin/cursos/${courseId}/avaliacoes/${it.id}` as never}>Editar</Link>
              </Button>
              {it.status !== "PUBLISHED" && (
                <Button variant="secondary" size="sm" onClick={() => publish(it.id)} disabled={isPending}>
                  Publicar
                </Button>
              )}
              <button onClick={() => remove(it.id)} className="p-1 text-navy-300 hover:text-red-500" aria-label="Excluir">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
