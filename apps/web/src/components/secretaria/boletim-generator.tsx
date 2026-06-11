"use client";

import { useState } from "react";
import { Button } from "@nexora/ui";
import { FileText, Download, Eye, Users } from "lucide-react";

type Format = "pdf" | "html" | "doc";

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

export function BoletimGenerator({ turmaId, turmaCode, students }: Props) {
  const [format, setFormat] = useState<Format>("pdf");

  function url(enrollmentId?: string) {
    const p = new URLSearchParams({ turmaId, format });
    if (enrollmentId) p.set("enrollmentId", enrollmentId);
    return `/api/secretaria/boletim?${p.toString()}`;
  }

  function generate(enrollmentId?: string) {
    // Âncora evita o popup que falha em "chrome-error" ao baixar arquivos.
    const a = document.createElement("a");
    a.href = url(enrollmentId);
    if (format === "html") {
      a.target = "_blank";
      a.rel = "noopener";
    } else {
      a.download = ""; // respeita o Content-Disposition do servidor
    }
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-navy-500">Formato:</span>
        <div className="flex gap-1">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFormat(f.value)}
              className={
                f.value === format
                  ? "rounded-md bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700"
                  : "rounded-md px-3 py-1.5 text-sm text-navy-500 hover:bg-navy-50"
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button onClick={() => generate()} className="gap-2 ml-auto" disabled={students.length === 0}>
          {format === "html" ? <Eye className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          <Users className="h-4 w-4" />
          Gerar turma inteira
        </Button>
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-navy-400">Nenhum aluno ativo nesta turma.</p>
      ) : (
        <div className="rounded-lg border border-navy-100 bg-white divide-y divide-navy-50">
          {students.map((s) => (
            <div key={s.enrollmentId} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-navy-800">{s.name}</span>
              <button
                onClick={() => generate(s.enrollmentId)}
                className="flex items-center gap-1.5 text-sm text-teal-600 hover:underline"
              >
                <FileText className="h-3.5 w-3.5" />
                Boletim individual
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
