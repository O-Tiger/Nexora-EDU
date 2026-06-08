import { auth } from "@nexora/auth";
import { NextResponse } from "next/server";
import { getPresignedUploadUrl, buildFileKey } from "@/lib/r2";
import { z } from "zod";

const MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB (cobre .imscc grandes)

const BodySchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.enum([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/zip",
    "application/octet-stream", // .imscc é reconhecido como octet-stream em alguns SOs
  ]),
  category: z.enum(["pdfs", "imagens", "imports"]),
  sizeBytes: z.number().int().positive().max(MAX_SIZE_BYTES),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { role } = session.user;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "COORDENADOR" && role !== "PROFESSOR") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const { fileName, contentType, category } = parsed.data;
  const fileKey = buildFileKey(session.user.activeTenantId, category as "pdfs" | "imagens" | "certificados", fileName);

  try {
    const url = await getPresignedUploadUrl(fileKey, contentType);
    return NextResponse.json({ url, fileKey });
  } catch (e) {
    console.error("[presign.POST] Erro ao gerar URL:", e);
    return NextResponse.json({ error: "Não foi possível gerar o link de upload" }, { status: 500 });
  }
}
