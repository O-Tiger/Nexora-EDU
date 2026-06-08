import { auth } from "@nexora/auth";
import { NextResponse } from "next/server";
import { validateSubmissionFile } from "@/lib/file-validation";
import { storeFile } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Upload de arquivo de entrega de avaliação.
// Valida MIME + magic bytes + limite antes de armazenar (R2 ou local em dev).
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { activeTenantId: tenantId } = session.user;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const check = validateSubmissionFile(buffer, file.name, file.type);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  try {
    const fileKey = await storeFile(tenantId, buffer, file.name);
    return NextResponse.json({ fileKey, fileName: file.name });
  } catch (e) {
    console.error("[upload.submission.POST] Erro ao armazenar:", e);
    return NextResponse.json({ error: "Não foi possível armazenar o arquivo" }, { status: 500 });
  }
}
