"use client";

import { useState, useRef } from "react";
import { Button, toast } from "@nexora/ui";
import { Upload, File as FileIcon, X, Loader2 } from "lucide-react";

export interface UploadedFile {
  fileKey: string;
  fileName: string;
}

interface Props {
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  accept?: string;
  maxFiles?: number;
  disabled?: boolean;
}

/**
 * Zona de upload reutilizável. Envia para /api/upload/submission, que valida
 * MIME + magic bytes server-side antes de armazenar. Componente não confia no
 * tipo do client — apenas exibe o resultado validado.
 */
export function FileUploadZone({ value, onChange, accept = ".pdf,.png,.jpg,.jpeg,.docx,.pptx,.xlsx,.zip", maxFiles = 5, disabled }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (value.length + files.length > maxFiles) {
      toast({ variant: "destructive", title: "Limite de arquivos", description: `Máximo de ${maxFiles} arquivos.` });
      return;
    }

    setUploading(true);
    const uploaded: UploadedFile[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload/submission", { method: "POST", body: fd });
        const data = (await res.json()) as { fileKey?: string; fileName?: string; error?: string };
        if (!res.ok || !data.fileKey) {
          toast({ variant: "destructive", title: `Falha em ${file.name}`, description: data.error ?? "Erro no upload" });
          continue;
        }
        uploaded.push({ fileKey: data.fileKey, fileName: data.fileName ?? file.name });
      } catch {
        toast({ variant: "destructive", title: `Falha em ${file.name}`, description: "Erro de rede" });
      }
    }
    setUploading(false);
    if (uploaded.length > 0) onChange([...value, ...uploaded]);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled || uploading || value.length >= maxFiles}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Enviar arquivo
      </Button>

      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((f) => (
            <li key={f.fileKey} className="flex items-center gap-2 rounded-md bg-navy-50 px-3 py-1.5 text-sm">
              <FileIcon className="h-3.5 w-3.5 shrink-0 text-navy-400" />
              <span className="flex-1 truncate text-navy-700">{f.fileName}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x.fileKey !== f.fileKey))}
                className="text-navy-300 hover:text-red-500"
                aria-label="Remover arquivo"
                disabled={disabled}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
