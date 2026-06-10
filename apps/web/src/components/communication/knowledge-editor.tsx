"use client";

import { useState, useTransition } from "react";
import { Button, Input, Textarea, Label, toast } from "@nexora/ui";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { createKnowledgeAction, updateKnowledgeAction, deleteKnowledgeAction } from "@/actions/communication";
import { useConfirm } from "@/hooks/use-confirm";

interface Entry {
  id: string;
  question: string;
  answer: string;
  active: boolean;
}

interface Props { initial: Entry[] }

export function KnowledgeEditor({ initial }: Props) {
  const [entries, setEntries] = useState<Entry[]>(initial);
  const [form, setForm] = useState({ question: "", answer: "" });
  const [isPending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();

  function add() {
    if (!form.question.trim() || !form.answer.trim()) return;
    startTransition(async () => {
      const r = await createKnowledgeAction({ question: form.question, answer: form.answer });
      if (r && "error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      if (r && "entryId" in r) {
        setEntries((prev) => [{ id: r.entryId!, question: form.question, answer: form.answer, active: true }, ...prev]);
        setForm({ question: "", answer: "" });
        toast({ title: "Entrada adicionada" });
      }
    });
  }

  function toggleActive(entry: Entry) {
    startTransition(async () => {
      await updateKnowledgeAction(entry.id, { active: !entry.active });
      setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, active: !e.active } : e));
    });
  }

  async function remove(id: string) {
    if (!await confirm({ title: "Excluir entrada", description: "Excluir esta entrada da base de conhecimento?", confirmLabel: "Excluir", confirmVariant: "destructive" })) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    startTransition(() => deleteKnowledgeAction(id));
  }

  return (
    <div className="space-y-4">
      <ConfirmDialog />
      <div className="rounded-lg border border-navy-100 bg-white p-4 space-y-3">
        <p className="text-sm font-medium text-navy-800">Nova entrada</p>
        <div className="space-y-1">
          <Label className="text-xs text-navy-500">Pergunta</Label>
          <Input value={form.question} maxLength={500} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} placeholder="Ex: Como solicitar segunda via do certificado?" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-navy-500">Resposta</Label>
          <Textarea rows={3} value={form.answer} maxLength={5000} onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))} placeholder="Resposta que o chatbot usará..." />
        </div>
        <Button size="sm" onClick={add} disabled={isPending || !form.question.trim() || !form.answer.trim()}>
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-navy-400">Nenhuma entrada ainda. Adicione perguntas e respostas para o chatbot.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className={`rounded-lg border bg-white p-3 ${e.active ? "border-navy-100" : "border-navy-50 opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-800">{e.question}</p>
                  <p className="mt-1 text-xs text-navy-500 line-clamp-2">{e.answer}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => toggleActive(e)} className="p-1 text-navy-400 hover:text-teal-600" aria-label={e.active ? "Desativar" : "Ativar"}>
                    {e.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button onClick={() => remove(e.id)} className="p-1 text-navy-300 hover:text-red-500" aria-label="Excluir">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
