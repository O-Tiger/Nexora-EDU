"use client";

import { useState, useTransition } from "react";
import { Button, Input, Textarea, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, toast } from "@nexora/ui";
import { createAnnouncementAction, updateAnnouncementAction } from "@/actions/communication";

interface Course { id: string; title: string }

interface Props {
  courses: Course[];
  onDone?: () => void;
  initial?: { id: string; title: string; body: string; scope: string; courseId?: string | null; pinned: boolean };
}

export function AnnouncementForm({ courses, onDone, initial }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [scope, setScope] = useState(initial?.scope ?? "PLATFORM");
  const [courseId, setCourseId] = useState(initial?.courseId ?? "");
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const data = { title, body, scope, pinned, ...(scope === "COURSE" && courseId ? { courseId } : {}) };
      const r = initial
        ? await updateAnnouncementAction(initial.id, data)
        : await createAnnouncementAction(data);
      if (r && "error" in r) {
        toast({ variant: "destructive", title: "Erro", description: r.error });
        return;
      }
      toast({ title: initial ? "Aviso atualizado" : "Aviso publicado" });
      onDone?.();
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs text-navy-500">Título</Label>
        <Input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-navy-500">Mensagem</Label>
        <Textarea rows={4} value={body} maxLength={10000} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-navy-500">Escopo</Label>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PLATFORM">Toda a plataforma</SelectItem>
              <SelectItem value="COURSE">Curso específico</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {scope === "COURSE" && (
          <div className="space-y-1">
            <Label className="text-xs text-navy-500">Curso</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm text-navy-700">
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-4 w-4 accent-teal-600" />
        Fixar aviso no topo
      </label>
      <Button size="sm" onClick={submit} disabled={isPending || !title.trim() || !body.trim()}>
        {initial ? "Salvar" : "Publicar"}
      </Button>
    </div>
  );
}
