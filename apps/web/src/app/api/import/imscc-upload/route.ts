import { auth } from "@nexora/auth";
import { NextResponse } from "next/server";
import { parseImscc } from "@/lib/imscc-parser";
import { createCourse } from "@nexora/db/src/queries/courses";
import { createModule, createLesson } from "@nexora/db/src/queries/modules";
import { storeFile } from "@/lib/storage";
import { z } from "zod";
import { tmpdir } from "os";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Sessões de upload em memória — só para dev/fallback
// Key: uploadId, Value: set de chunkIndexes recebidos
const uploadSessions = new Map<string, { totalChunks: number; received: Set<number> }>();

const ChunkSchema = z.object({
  uploadId: z.string().uuid(),
  chunkIndex: z.number().int().min(0),
  totalChunks: z.number().int().min(1).max(1000),
  data: z.string().min(1), // base64
  fileName: z.string().min(1).max(200),
});

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

  const parsed = ChunkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const { uploadId, chunkIndex, totalChunks, data, fileName } = parsed.data;

  // Validar nome do arquivo
  if (!fileName.endsWith(".imscc") && !fileName.endsWith(".zip")) {
    return NextResponse.json({ error: "Extensão inválida" }, { status: 400 });
  }

  // Salvar chunk no /tmp
  const tmpDir = join(tmpdir(), "nexora-imports", uploadId);
  if (!existsSync(tmpDir)) {
    await mkdir(tmpDir, { recursive: true });
  }

  let chunkBuffer: Buffer;
  try {
    chunkBuffer = Buffer.from(data, "base64");
  } catch {
    return NextResponse.json({ error: "Dados de chunk inválidos" }, { status: 400 });
  }

  await writeFile(join(tmpDir, `chunk-${chunkIndex}`), chunkBuffer);

  // Registrar chunk recebido
  if (!uploadSessions.has(uploadId)) {
    uploadSessions.set(uploadId, { totalChunks, received: new Set() });
  }
  const session_ = uploadSessions.get(uploadId)!;
  session_.received.add(chunkIndex);

  const allReceived = session_.received.size === totalChunks;

  if (!allReceived) {
    return NextResponse.json({
      status: "chunk_received",
      received: session_.received.size,
      total: totalChunks,
    });
  }

  // Todos os chunks chegaram — montar o arquivo
  uploadSessions.delete(uploadId);

  let fullBuffer: Buffer;
  try {
    const chunks: Buffer[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = join(tmpDir, `chunk-${i}`);
      chunks.push(await readFile(chunkPath));
    }
    fullBuffer = Buffer.concat(chunks);
  } catch (e) {
    console.error("[imscc-upload.POST] Erro ao montar arquivo:", e);
    return NextResponse.json({ error: "Erro ao montar arquivo" }, { status: 500 });
  } finally {
    // Limpar chunks do /tmp
    for (let i = 0; i < totalChunks; i++) {
      await unlink(join(tmpDir, `chunk-${i}`)).catch(() => {});
    }
  }

  // Verificar magic bytes
  if (fullBuffer[0] !== 0x50 || fullBuffer[1] !== 0x4b || fullBuffer[2] !== 0x03 || fullBuffer[3] !== 0x04) {
    return NextResponse.json({ error: "Arquivo inválido (não é um ZIP válido)" }, { status: 400 });
  }

  let parsedFile;
  try {
    parsedFile = await parseImscc(fullBuffer);
  } catch (e) {
    console.error("[imscc-upload.POST] Erro ao parsear:", e);
    return NextResponse.json({ error: "Não foi possível processar o arquivo .imscc" }, { status: 422 });
  }

  const slug = parsedFile.courseTitle
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  const course = await createCourse(activeTenantId, {
    title: parsedFile.courseTitle,
    slug: `${slug}-${Date.now()}`,
  });

  // Armazena PDFs extraídos (R2 em prod, disco local em dev sem R2)
  const fileKeyMap = new Map<string, string>();
  for (const [originalPath, fileBuffer] of parsedFile.files) {
    try {
      const name = originalPath.split("/").pop() ?? "arquivo";
      fileKeyMap.set(originalPath, await storeFile(activeTenantId, fileBuffer, name));
    } catch (e) {
      console.error("[imscc-upload.POST] Erro ao armazenar arquivo:", originalPath, e);
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
    status: "complete",
    courseId: course.id,
    courseTitle: parsedFile.courseTitle,
    modulesCount: parsedFile.modules.length,
    lessonsCount: parsedFile.modules.reduce((a, m) => a + m.lessons.length, 0),
  });
}
