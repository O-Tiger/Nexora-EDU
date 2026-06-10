"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@nexora/ui";
import { Video, Clock, ExternalLink, CheckCircle2 } from "lucide-react";
import { attendLiveAction } from "@/actions/live-sessions";

interface Props {
  liveSessionId: string;
  title: string;
  meetingUrl: string;
  startAt: Date | string;
  durationMin: number;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  recordingUrl?: string | null;
}

function useCountdown(target: Date) {
  const [diff, setDiff] = useState(() => target.getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setDiff(target.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { h, m, s };
}

function Pad({ n }: { n: number }) {
  return <span>{String(n).padStart(2, "0")}</span>;
}

export function LiveRoom({ liveSessionId, title, meetingUrl, startAt, durationMin, status, recordingUrl }: Props) {
  const start = new Date(startAt);
  const countdown = useCountdown(start);
  const [joined, setJoined] = useState(false);
  const [left, setLeft] = useState(false);

  const join = useCallback(async () => {
    setJoined(true);
    await attendLiveAction(liveSessionId, "join");
  }, [liveSessionId]);

  const leave = useCallback(async () => {
    setLeft(true);
    await attendLiveAction(liveSessionId, "leave");
  }, [liveSessionId]);

  // Aula encerrada com gravação
  if (status === "ENDED") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-teal-500" />
        <h2 className="text-xl font-bold text-navy-900">Aula encerrada</h2>
        {recordingUrl ? (
          <>
            <p className="text-navy-600">A gravação está disponível:</p>
            <Button asChild>
              <a href={recordingUrl} target="_blank" rel="noopener noreferrer">
                <Video className="h-4 w-4" /> Assistir gravação
              </a>
            </Button>
          </>
        ) : (
          <p className="text-navy-500">A gravação será disponibilizada em breve.</p>
        )}
      </div>
    );
  }

  if (status === "CANCELLED") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
        <p className="text-lg font-semibold text-navy-700">Esta aula foi cancelada.</p>
      </div>
    );
  }

  // Sala de espera
  if (status === "SCHEDULED" || (status === "LIVE" && !joined)) {
    const isLive = status === "LIVE";
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-10 text-center">
        <div className="rounded-full bg-teal-50 p-4">
          {isLive
            ? <span className="flex items-center gap-2 text-teal-600 font-bold"><span className="h-3 w-3 rounded-full bg-teal-500 animate-pulse inline-block" />AO VIVO</span>
            : <Clock className="h-10 w-10 text-navy-400" />
          }
        </div>

        <h2 className="text-2xl font-bold text-navy-900">{title}</h2>

        {!isLive && countdown && (
          <div>
            <p className="mb-3 text-sm text-navy-500">A aula começa em</p>
            <div className="flex items-center gap-2 text-4xl font-mono font-bold text-navy-900">
              <Pad n={countdown.h} />
              <span>:</span>
              <Pad n={countdown.m} />
              <span>:</span>
              <Pad n={countdown.s} />
            </div>
            <p className="mt-2 text-xs text-navy-400">
              {start.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} às{" "}
              {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {durationMin} min
            </p>
          </div>
        )}

        {!isLive && !countdown && (
          <p className="text-navy-500">A aula deve começar em instantes...</p>
        )}

        {isLive && (
          <p className="text-navy-600">
            Clique em &ldquo;Entrar na aula&rdquo; para participar. Sua presença será registrada automaticamente.
          </p>
        )}

        <Button
          disabled={!isLive}
          onClick={isLive ? join : undefined}
          size="lg"
          className={!isLive ? "opacity-50 cursor-not-allowed" : ""}
        >
          <Video className="h-5 w-5" />
          {isLive ? "Entrar na aula" : "Aguardando início..."}
        </Button>
      </div>
    );
  }

  // Aula ao vivo — aluno entrou
  if (status === "LIVE" && joined && !left) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between gap-3 border-b border-navy-100 bg-white px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-semibold text-navy-900">AO VIVO — {title}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" asChild>
              <a href={meetingUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> Abrir em nova aba
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={leave}>Sair da sala</Button>
          </div>
        </div>

        {/* Embed do meeting como iframe */}
        <iframe
          src={meetingUrl}
          className="flex-1 w-full border-0"
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          title={`Aula ao vivo: ${title}`}
        />
      </div>
    );
  }

  // Saiu da sala
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
      <CheckCircle2 className="h-12 w-12 text-teal-500" />
      <p className="text-lg font-semibold text-navy-900">Você saiu da aula.</p>
      <Button onClick={join}>Voltar para a sala</Button>
    </div>
  );
}
