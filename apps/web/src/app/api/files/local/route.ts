import { auth } from "@nexora/auth";
import { NextResponse } from "next/server";
import { isLocalKey, readLocalFile } from "@/lib/local-storage";
import { contentTypeFor, isInlineViewable } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Serve arquivos do storage local (fallback de dev quando o R2 não está configurado).
 * Em produção, os arquivos vivem no R2 e esta rota nunca é usada.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key || !isLocalKey(key)) {
    return NextResponse.json({ error: "Chave inválida" }, { status: 400 });
  }

  // Anti-IDOR: a key sempre começa com o tenantId. Garante que o usuário só
  // acessa arquivos do próprio tenant ativo.
  const expectedPrefix = `local:${session.user.activeTenantId}/`;
  if (!key.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  let buffer: Buffer;
  try {
    buffer = await readLocalFile(key);
  } catch (e) {
    console.error("[files.local.GET] Arquivo não encontrado:", key, e);
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  const disposition = isInlineViewable(key) ? "inline" : "attachment";
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentTypeFor(key),
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=600",
    },
  });
}
