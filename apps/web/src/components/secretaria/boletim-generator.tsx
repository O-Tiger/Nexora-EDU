"use client";

import { useState } from "react";
import { Button } from "@nexora/ui";
import { FileText, Download, Eye, Users, X } from "lucide-react";

type Format = "pdf" | "html" | "doc";
type Frentes = "avulsas" | "media";
type Template = "padrao" | "ccc";

interface Student { enrollmentId: string; name: string }

interface Props {
  turmaId: string;
  turmaCode: string;
  students: Student[];
}

const FORMATS: { value: Format; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "html", label: "HTML" },
  { value: "doc", label: "Word (.doc)" },
];

const FRENTES_OPTS: { value: Frentes; label: string; hint: string }[] = [
  { value: "avulsas", label: "Frentes avulsas", hint: "Cada frente como linha própria" },
  { value: "media", label: "Média das frentes", hint: "Consolida as frentes na disciplina" },
];

const TEMPLATE_OPTS: { value: Template; label: string; hint: string }[] = [
  { value: "padrao", label: "Padrão", hint: "Layout genérico Nexora" },
  { value: "ccc", label: "CCC", hint: "Layout Colégio Caminhos e Colinas" },
];

export function BoletimGenerator({ turmaId, students }: Props) {
  const [format, setFormat] = useState<Format>("pdf");
  const [frentes, setFrentes] = useState<Frentes>("avulsas");
  const [template, setTemplate] = useState<Template>("padrao");
  const [preview, setPreview] = useState<{ enrollmentId?: string; label: string } | null>(null);

  function url(fmt: Format, enrollmentId?: string) {
    const p = new URLSearchParams({ turmaId, format: fmt, frentes, template });
    if (enrollmentId) p.set("enrollmentId", enrollmentId);
    return `/api/secretaria/boletim?${p.toString()}`;
  }

  function download(enrollmentId?: string) {
    const a = document.createElement("a");
    a.href = url(format, enrollmentId);
    if (format === "html") { a.target = "_blank"; a.rel = "noopener"; }
    else a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function showPreview(enrollmentId: string | undefined, label: string) {
    setPreview(enrollmentId ? { enrollmentId, label } : { label });
  }

  return (
    <div className="space-y-4">
      {/* Opções */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-navy-500">Formato:</span>
          <div className="flex gap-1">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFormat(f.value)}
                className={f.value === format
                  ? "rounded-md bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700"
                  : "rounded-md px-3 py-1.5 text-sm text-navy-500 hover:bg-navy-50"}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-navy-500">Frentes:</span>
          <div className="flex gap-1">
            {FRENTES_OPTS.map((o) => (
              <button
                key={o.value}
                onClick={() => setFrentes(o.value)}
                title={o.hint}
                className={o.value === frentes
                  ? "rounded-md bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700"
                  : "rounded-md px-3 py-1.5 text-sm text-navy-500 hover:bg-navy-50"}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-navy-500">Template:</span>
          <div className="flex gap-1">
            {TEMPLATE_OPTS.map((o) => (
              <button
                key={o.value}
                onClick={() => setTemplate(o.value)}
                title={o.hint}
                className={o.value === template
                  ? "rounded-md bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700"
                  : "rounded-md px-3 py-1.5 text-sm text-navy-500 hover:bg-navy-50"}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => showPreview(undefined, "Turma inteira")} variant="outline" className="gap-2" disabled={students.length === 0}>
          <Eye className="h-4 w-4" /> Visualizar turma
        </Button>
        <Button onClick={() => download()} className="gap-2" disabled={students.length === 0}>
          {format === "html" ? <Eye className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          <Users className="h-4 w-4" />
          Gerar turma inteira
        </Button>
      </div>

      {/* Preview inline */}
      {preview && (
        <div className="rounded-lg border border-navy-200 bg-navy-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-navy-200 bg-white">
            <span className="text-sm font-medium text-navy-700">Pré-visualização — {preview.label}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => download(preview.enrollmentId)} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> Baixar ({format.toUpperCase()})
              </Button>
              <button onClick={() => setPreview(null)} className="p-1 text-navy-400 hover:text-navy-700" aria-label="Fechar preview">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <iframe src={url("html", preview.enrollmentId)} title="Pré-visualização do boletim" className="w-full h-[600px] bg-white" />
        </div>
      )}

      {/* Lista de alunos */}
      {students.length === 0 ? (
        <p className="text-sm text-navy-400">Nenhum aluno ativo nesta turma.</p>
      ) : (
        <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
          {students.map((s) => (
            <div key={s.enrollmentId} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-navy-800">{s.name}</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => showPreview(s.enrollmentId, s.name)}
                  className="flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-800"
                >
                  <Eye className="h-3.5 w-3.5" /> Visualizar
                </button>
                <button
                  onClick={() => download(s.enrollmentId)}
                  className="flex items-center gap-1.5 text-sm text-teal-600 hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" /> Baixar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
