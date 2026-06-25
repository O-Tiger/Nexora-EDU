import { auth } from "@nexora/auth";
import { NextResponse } from "next/server";
import { parseImscc } from "@/lib/imscc-parser";
import { createCourse } from "@nexora/db/src/queries/courses";
import { createModule, createLesson } from "@nexora/db/src/queries/modules";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { storeFile } from "@/lib/storage";
import { z } from "zod";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  fileKey: z.string().min(1).max(500),
  fileName: z.string().min(1).max(200),
});

function getS3Client() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY;
  const secretKey = process.env.CLOUDFLARE_R2_SECRET_KEY;
  if (!accountId || !accessKey || !secretKey) throw new Error("R2 não configurado");
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { role, activeTenantId } = session.user;
  if (role !== "ADMINISTRATOR" && role !== "OWNER" && role !== "ASSISTANT") {
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

  const { fileKey } = parsed.data;

  // Verificar que o fileKey pertence ao tenant atual (previne IDOR)
  if (!fileKey.startsWith(`${activeTenantId}/`)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const bucket = process.env.CLOUDFLARE_R2_BUCKET ?? "nexora-edu";
  let buffer: Buffer;

  try {
    const s3 = getS3Client();
    const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: fileKey }));
    const chunks: Uint8Array[] = [];
    for await (const chunk of obj.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    buffer = Buffer.concat(chunks);
  } catch (e) {
    console.error("[imscc-from-r2.POST] Erro ao baixar arquivo do R2:", e);
    return NextResponse.json({ error: "Não foi possível ler o arquivo importado" }, { status: 500 });
  }

  // Verificar magic bytes do ZIP
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
    return NextResponse.json({ error: "Arquivo inválido (não é um ZIP válido)" }, { status: 400 });
  }

  let parsedFile;
  try {
    parsedFile = await parseImscc(buffer);
  } catch (e) {
    console.error("[imscc-from-r2.POST] Erro ao parsear:", e);
    return NextResponse.json({ error: "Não foi possível processar o arquivo .imscc" }, { status: 422 });
  }

  const slug = parsedFile.courseTitle
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const uniqueSlug = `${slug}-${Date.now()}`;

  const course = await createCourse(activeTenantId, {
    title: parsedFile.courseTitle,
    slug: uniqueSlug,
  });

  // Armazena PDFs extraídos (R2 em prod, disco local em dev sem R2)
  const fileKeyMap = new Map<string, string>();
  for (const [originalPath, fileBuffer] of parsedFile.files) {
    try {
      const name = originalPath.split("/").pop() ?? "arquivo";
      fileKeyMap.set(originalPath, await storeFile(activeTenantId, fileBuffer, name));
    } catch (e) {
      console.error("[imscc-from-r2.POST] Erro ao armazenar arquivo:", originalPath, e);
      // Continua mesmo se falhar — a aula fica sem arquivo
    }
  }

  for (const mod of parsedFile.modules) {
    const createdMod = await createModule(activeTenantId, course.id, { title: mod.title });
    for (const lesson of mod.lessons) {
      const pdfFileKey = lesson.originalFileName
        ? fileKeyMap.get([...parsedFile.files.keys()].find((k) => k.includes(lesson.originalFileName!)) ?? "")
        : undefined;
      await createLesson(activeTenantId, createdMod.id, {
        title: lesson.title,
        type: lesson.type,
        ...(lesson.content !== undefined && { content: lesson.content }),
        ...(lesson.url !== undefined && { url: lesson.url }),
        ...(pdfFileKey !== undefined && { fileKey: pdfFileKey }),
      });
    }
  }

  return NextResponse.json({
    courseId: course.id,
    courseTitle: parsedFile.courseTitle,
    modulesCount: parsedFile.modules.length,
    lessonsCount: parsedFile.modules.reduce((a, m) => a + m.lessons.length, 0),
  });
}
