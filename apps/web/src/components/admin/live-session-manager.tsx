"use client";

import { useState, useTransition } from "react";
import { Button, Input, Label, toast } from "@nexora/ui";
import { Video, Play, Square, Link as LinkIcon } from "lucide-react";
import {
  createLiveSessionAction,
  updateLiveSessionAction,
  setRecordingAction,
} from "@/actions/live-sessions";
import { useConfirm } from "@/hooks/use-confirm";

interface Session {
  id: string;
  meetingUrl: string;
  startAt: Date | string;
  durationMin: number;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  recordingUrl?: string | null;
  attendances: number;
}

interface Props {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  session: Session | null;
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendada",
  LIVE: "Ao vivo",
  ENDED: "Encerrada",
  CANCELLED: "Cancelada",
};

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "bg-navy-50 text-navy-700",
  LIVE: "bg-red-50 text-red-700",
  ENDED: "bg-green-50 text-green-700",
  CANCELLED: "bg-navy-50 text-navy-400",
};

export function LiveSessionManager({ courseId, lessonId, lessonTitle, session: initial }: Props) {
  const [session, setSession] = useState<Session | null>(initial);
  const [form, setForm] = useState({
    meetingUrl: initial?.meetingUrl ?? "",
    startAt: initial?.startAt
      ? new Date(initial.startAt).toISOString().slice(0, 16)
      : "",
    durationMin: initial?.durationMin ?? 60,
  });
  const [recordingUrl, setRecordingUrl] = useState(initial?.recordingUrl ?? "");
  const [isPending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();

  function create() {
    startTransition(async () => {
      const r = await createLiveSessionAction(courseId, {
        lessonId,
        meetingUrl: form.meetingUrl,
        startAt: new Date(form.startAt),
        durationMin: form.durationMin,
      });
      if (r && "error" in r) {
        toast({ variant: "destructive", title: "Erro", description: r.error });
        return;
      }
      if (r && "sessionId" in r) {
        setSession({
          id: r.sessionId!,
          meetingUrl: form.meetingUrl,
          startAt: new Date(form.startAt),
          durationMin: form.durationMin,
          status: "SCHEDULED",
          recordingUrl: null,
          attendances: 0,
        });
        toast({ title: "Sessão agendada" });
      }
    });
  }

  async function changeStatus(status: "LIVE" | "ENDED" | "CANCELLED") {
    if (!session) return;
    const label = status === "LIVE" ? "Iniciar a aula ao vivo" : status === "ENDED" ? "Encerrar a aula" : "Cancelar a sessão";
    if (!await confirm({ description: `${label}?`, confirmLabel: "Confirmar", confirmVariant: status === "CANCELLED" ? "destructive" : "default" })) return;

    startTransition(async () => {
      const r = await updateLiveSessionAction(courseId, session.id, { status });
      if (r && "error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      setSession((s) => s ? { ...s, status } : s);
      toast({ title: status === "LIVE" ? "Aula iniciada" : status === "ENDED" ? "Aula encerrada" : "Sessão cancelada" });
    });
  }

  function saveRecording() {
    if (!session || !recordingUrl.trim()) return;
    startTransition(async () => {
      const r = await setRecordingAction(courseId, session.id, recordingUrl.trim());
      if (r && "error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      setSession((s) => s ? { ...s, recordingUrl: recordingUrl.trim() } : s);
      toast({ title: "Gravação vinculada" });
    });
  }

  return (
    <div className="rounded-lg border border-navy-100 bg-white p-4 space-y-4">
      <ConfirmDialog />
      <div className="flex items-center gap-2">
        <Video className="h-4 w-4 text-teal-600" />
        <h3 className="font-medium text-navy-900">Aula ao vivo</h3>
        {session && (
          <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[session.status]}`}>
            {STATUS_LABEL[session.status]}
          </span>
        )}
      </div>

      {!session ? (
        <div className="space-y-3">
          <p className="text-sm text-navy-500">Agende a sessão para <strong>{lessonTitle}</strong>.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label className="text-xs text-navy-500">Link da reunião (Zoom, Meet, Teams...)</Label>
              <Input value={form.meetingUrl} placeholder="https://zoom.us/j/..." onChange={(e) => setForm((f) => ({ ...f, meetingUrl: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-navy-500">Data e hora de início</Label>
              <Input type="datetime-local" value={form.startAt} onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-navy-500">Duração (min)</Label>
              <Input type="number" min={5} max={480} value={form.durationMin} onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) || 60 }))} />
            </div>
          </div>
          <Button size="sm" onClick={create} disabled={isPending || !form.meetingUrl.trim() || !form.startAt}>
            Agendar sessão
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-md bg-navy-50 px-3 py-2 text-sm space-y-1">
            <p className="flex items-center gap-1.5 text-navy-600 truncate">
              <LinkIcon className="h-3.5 w-3.5 shrink-0" />
              <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer" className="truncate hover:text-teal-600">{session.meetingUrl}</a>
            </p>
            <p className="text-xs text-navy-400">
              {new Date(session.startAt).toLocaleString("pt-BR")} · {session.durationMin} min · {session.attendances} presença{session.attendances !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {session.status === "SCHEDULED" && (
              <>
                <Button size="sm" onClick={() => changeStatus("LIVE")} disabled={isPending}>
                  <Play className="h-4 w-4" /> Iniciar ao vivo
                </Button>
                <Button variant="secondary" size="sm" onClick={() => changeStatus("CANCELLED")} disabled={isPending}>
                  Cancelar
                </Button>
              </>
            )}
            {session.status === "LIVE" && (
              <Button size="sm" variant="outline" onClick={() => changeStatus("ENDED")} disabled={isPending}>
                <Square className="h-4 w-4" /> Encerrar aula
              </Button>
            )}
          </div>

          {session.status === "ENDED" && (
            <div className="space-y-1">
              <Label className="text-xs text-navy-500">Link da gravação no YouTube</Label>
              <div className="flex gap-2">
                <Input value={recordingUrl} placeholder="https://youtu.be/..." onChange={(e) => setRecordingUrl(e.target.value)} />
                <Button size="sm" onClick={saveRecording} disabled={isPending || !recordingUrl.trim()}>
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
