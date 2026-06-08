import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join, normalize, sep } from "path";

// Diretório de fallback para dev quando o R2 não está configurado.
// NÃO é versionado (ver .gitignore) e nunca deve ser usado em produção.
const LOCAL_DIR = join(process.cwd(), ".local-storage");
const LOCAL_PREFIX = "local:";

export function isLocalKey(fileKey: string): boolean {
  return fileKey.startsWith(LOCAL_PREFIX);
}

/**
 * Remove o prefixo `local:`, normaliza separadores e bloqueia path traversal.
 */
function toSafeRelative(key: string): string {
  return key
    .replace(/^local:/, "")
    .replace(/\\/g, "/")
    .replace(/\.\.+/g, "")
    .replace(/^\/+/, "");
}

function resolveSafePath(relative: string): string {
  const full = normalize(join(LOCAL_DIR, relative));
  const base = normalize(LOCAL_DIR);
  if (full !== base && !full.startsWith(base + sep)) {
    throw new Error("Caminho fora do diretório permitido");
  }
  return full;
}

/**
 * Persiste um buffer no disco local (apenas dev). Retorna a fileKey com prefixo `local:`.
 */
export async function storeLocalFile(relativeKey: string, buffer: Buffer): Promise<string> {
  const safe = toSafeRelative(relativeKey);
  const fullPath = resolveSafePath(safe);
  const dir = join(fullPath, "..");
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(fullPath, buffer);
  return `${LOCAL_PREFIX}${safe}`;
}

/**
 * Lê um arquivo local pela fileKey (com ou sem prefixo `local:`).
 */
export async function readLocalFile(fileKey: string): Promise<Buffer> {
  const safe = toSafeRelative(fileKey);
  const fullPath = resolveSafePath(safe);
  return readFile(fullPath);
}
