import { getPresignedDownloadUrl, uploadToR2 } from "@/lib/r2";
import { isLocalKey, storeLocalFile } from "@/lib/local-storage";

export function isR2Configured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_R2_ACCOUNT_ID &&
      process.env.CLOUDFLARE_R2_ACCESS_KEY &&
      process.env.CLOUDFLARE_R2_SECRET_KEY,
  );
}

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  txt: "text/plain",
  zip: "application/zip",
};

export function extOf(name: string): string {
  return (name.split(".").pop() ?? "").toLowerCase();
}

export function contentTypeFor(name: string): string {
  return CONTENT_TYPES[extOf(name)] ?? "application/octet-stream";
}

/** Formatos que o browser consegue renderizar inline num iframe. */
export function isInlineViewable(name: string): boolean {
  const ext = extOf(name);
  return ext === "pdf" || ["png", "jpg", "jpeg", "gif", "svg"].includes(ext);
}

/**
 * Armazena um arquivo e retorna sua fileKey, preservando a extensão original.
 * - Com R2 configurado: envia ao bucket com o Content-Type correto.
 * - Sem R2 (dev): grava em disco local e retorna uma key `local:...`.
 * A key sempre começa com o tenantId, permitindo checagem de posse (anti-IDOR).
 */
export async function storeFile(
  tenantId: string,
  buffer: Buffer,
  originalName: string,
): Promise<string> {
  const ext = extOf(originalName) || "bin";
  const key = `${tenantId}/files/${crypto.randomUUID()}.${ext}`;
  if (isR2Configured()) {
    await uploadToR2(key, buffer, contentTypeFor(originalName));
    return key;
  }
  return storeLocalFile(key, buffer);
}

/**
 * Resolve a URL acessível pelo browser a partir de uma fileKey.
 * - Key local (`local:`): rota interna autenticada de servir arquivos.
 * - Key do R2: presigned URL temporária (15 min).
 */
export async function resolveFileUrl(fileKey: string): Promise<string> {
  if (isLocalKey(fileKey)) {
    return `/api/files/local?key=${encodeURIComponent(fileKey)}`;
  }
  return getPresignedDownloadUrl(fileKey);
}
