"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, toast } from "@nexora/ui";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";

type Status = "idle" | "uploading-r2" | "uploading-chunks" | "processing" | "success" | "error";

interface ImportResult {
  courseId: string;
  courseTitle: string;
  modulesCount: number;
  lessonsCount: number;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB — abaixo do limite de 10 MB do Next.js

export function ImsccImporter() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

  async function handleFile(file: File) {
    if (!file.name.endsWith(".imscc") && !file.name.endsWith(".zip")) {
      toast({ variant: "destructive", title: "Arquivo inválido", description: "Selecione um arquivo .imscc ou .zip" });
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Arquivo muito grande", description: "Máximo 200 MB" });
      return;
    }

    // Tentar fluxo via R2 primeiro
    const r2Available = await tryR2Upload(file);
    if (!r2Available) {
      // Fallback: chunked upload direto ao servidor
      await chunkedUpload(file);
    }
  }

  async function tryR2Upload(file: File): Promise<boolean> {
    setStatus("uploading-r2");
    setProgress(5);
    setProgressLabel("Preparando upload...");

    let presignRes: Response;
    try {
      presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: "application/octet-stream",
          category: "imports",
          sizeBytes: file.size,
        }),
      });
    } catch {
      return false; // R2 não disponível — usar fallback
    }

    if (!presignRes.ok) return false;

    const { url, fileKey } = await presignRes.json() as { url: string; fileKey: string };

    setProgress(15);
    setProgressLabel("Enviando arquivo...");

    try {
      const uploadRes = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "application/octet-stream" },
      });
      if (!uploadRes.ok) return false;
    } catch {
      return false;
    }

    setStatus("processing");
    setProgress(60);
    setProgressLabel("Processando conteúdo do curso...");

    try {
      const processRes = await fetch("/api/import/imscc-from-r2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey, fileName: file.name }),
      });

      setProgress(95);
      const data = await processRes.json() as ImportResult & { error?: string };

      if (!processRes.ok) {
        setStatus("error");
        setErrorMsg(data.error ?? "Erro ao processar o arquivo");
        return true; // R2 estava disponível, mas houve erro no processamento
      }

      setProgress(100);
      setStatus("success");
      setResult(data);
      return true;
    } catch {
      setStatus("error");
      setErrorMsg("Não foi possível processar o arquivo importado");
      return true;
    }
  }

  async function chunkedUpload(file: File) {
    setStatus("uploading-chunks");
    setProgress(0);

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = crypto.randomUUID();
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = bytes.slice(start, end);

      // Converter para base64
      let binary = "";
      for (let j = 0; j < chunk.length; j++) binary += String.fromCharCode(chunk[j]!);
      const data = btoa(binary);

      const sendProgress = Math.round(((i + 1) / totalChunks) * 70);
      setProgress(sendProgress);
      setProgressLabel(`Enviando parte ${i + 1} de ${totalChunks}...`);

      let res: Response;
      try {
        res = await fetch("/api/import/imscc-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadId, chunkIndex: i, totalChunks, data, fileName: file.name }),
        });
      } catch {
        setStatus("error");
        setErrorMsg("Falha de conexão durante o envio");
        return;
      }

      const json = await res.json() as { status?: string; error?: string; courseId?: string; courseTitle?: string; modulesCount?: number; lessonsCount?: number };

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(json.error ?? "Erro ao enviar arquivo");
        return;
      }

      if (json.status === "complete") {
        setProgress(100);
        setStatus("success");
        setResult({
          courseId: json.courseId!,
          courseTitle: json.courseTitle!,
          modulesCount: json.modulesCount!,
          lessonsCount: json.lessonsCount!,
        });
        return;
      }
    }

    // Se chegou aqui sem "complete", algo deu errado
    setStatus("error");
    setErrorMsg("Processamento incompleto — tente novamente");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  if (status === "success" && result) {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-green-100 p-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-navy-900">{result.courseTitle}</p>
            <p className="text-sm text-navy-500 mt-1">
              {result.modulesCount} módulo{result.modulesCount !== 1 ? "s" : ""} · {result.lessonsCount} aula{result.lessonsCount !== 1 ? "s" : ""} importadas
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => router.push(`/admin/cursos/${result.courseId}`)}>
              Ver curso
            </Button>
            <Button variant="outline" onClick={() => { setStatus("idle"); setResult(null); setProgress(0); }}>
              Importar outro
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isLoading = status === "uploading-r2" || status === "uploading-chunks" || status === "processing";

  const defaultLabel =
    status === "uploading-chunks"
      ? progressLabel
      : status === "uploading-r2" || status === "processing"
      ? progressLabel
      : "Arraste o arquivo aqui ou clique para selecionar";

  return (
    <Card>
      <CardContent className="pt-6">
        {status === "error" && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
            <button
              className="ml-2 text-xs underline shrink-0"
              onClick={() => { setStatus("idle"); setProgress(0); setErrorMsg(""); }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !isLoading && inputRef.current?.click()}
          className={`flex flex-col items-center gap-4 rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
            isLoading
              ? "cursor-not-allowed border-navy-100 bg-navy-50/30"
              : "cursor-pointer border-navy-200 bg-navy-50/50 hover:border-teal-400 hover:bg-teal-50/30"
          }`}
        >
          <div className="rounded-full bg-white p-4 shadow-sm border border-navy-100">
            <Upload className={`h-8 w-8 ${isLoading ? "text-navy-300" : "text-teal-600"}`} />
          </div>
          <div className="text-center">
            <p className="font-medium text-navy-800">{defaultLabel}</p>
            <p className="text-sm text-navy-400 mt-1">.imscc ou .zip · máx. 200 MB</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".imscc,.zip"
            className="hidden"
            disabled={isLoading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
          />
        </div>

        {isLoading && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-navy-500">
              <span>{progressLabel || "Aguarde..."}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-navy-100">
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
