// Validação de upload por magic bytes (assinatura real do arquivo), não só extensão.
// Spec/CLAUDE.md: checar MIME + magic bytes + limite por tipo; rejeitar executáveis.

export interface FileTypeRule {
  ext: string;
  mimes: string[];
  /** Assinaturas possíveis (primeiros bytes). */
  magic: number[][];
  /** Limite em bytes. */
  maxBytes: number;
}

const MB = 1024 * 1024;

export const SUBMISSION_FILE_RULES: FileTypeRule[] = [
  { ext: "pdf", mimes: ["application/pdf"], magic: [[0x25, 0x50, 0x44, 0x46]], maxBytes: 20 * MB },
  { ext: "png", mimes: ["image/png"], magic: [[0x89, 0x50, 0x4e, 0x47]], maxBytes: 10 * MB },
  {
    ext: "jpg",
    mimes: ["image/jpeg"],
    magic: [[0xff, 0xd8, 0xff]],
    maxBytes: 10 * MB,
  },
  {
    // docx/pptx/xlsx e zip compartilham a assinatura ZIP (PK\x03\x04)
    ext: "zip",
    mimes: [
      "application/zip",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    magic: [[0x50, 0x4b, 0x03, 0x04]],
    maxBytes: 50 * MB,
  },
];

function matchesMagic(buf: Buffer, magics: number[][]): boolean {
  return magics.some((sig) => sig.every((byte, i) => buf[i] === byte));
}

export type FileValidation =
  | { ok: true; ext: string }
  | { ok: false; error: string };

/**
 * Valida um arquivo de entrega contra o allowlist por extensão informada,
 * MIME declarado e magic bytes reais. Rejeita qualquer divergência.
 */
export function validateSubmissionFile(
  buffer: Buffer,
  fileName: string,
  mime: string,
  rules: FileTypeRule[] = SUBMISSION_FILE_RULES,
): FileValidation {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  const officeExts: Record<string, string> = { docx: "zip", pptx: "zip", xlsx: "zip" };
  const ruleExt = officeExts[ext] ?? ext;

  const rule = rules.find((r) => r.ext === ruleExt);
  if (!rule) return { ok: false, error: `Tipo de arquivo não permitido: .${ext}` };

  if (buffer.length > rule.maxBytes) {
    return { ok: false, error: `Arquivo excede o limite de ${Math.round(rule.maxBytes / MB)}MB` };
  }
  if (mime && !rule.mimes.includes(mime)) {
    return { ok: false, error: "Tipo MIME não corresponde ao esperado" };
  }
  if (!matchesMagic(buffer, rule.magic)) {
    return { ok: false, error: "Conteúdo do arquivo não confere com a extensão (assinatura inválida)" };
  }
  return { ok: true, ext };
}
