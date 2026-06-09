import { auth } from "@nexora/auth";
import { NextResponse } from "next/server";

// Necessário para aceitar arquivos .imscc de até 100 MB
export const maxDuration = 300;
export const dynamic = "force-dynamic";
import { parseImscc } from "@/lib/imscc-parser";
import { createCourse } from "@nexora/db/src/queries/courses";
import { createModule, createLesson } from "@nexora/db/src/queries/modules";
import { storeFile } from "@/lib/storage";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { role, activeTenantId } = session.user;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "COORDENADOR") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande (máx 100 MB)" }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

  if (!file.name.endsWith(".imscc") && !file.name.endsWith(".zip")) {
    return NextResponse.json({ error: "Arquivo deve ter extensão .imscc ou .zip" }, { status: 400 });
  }

  // Verificar magic bytes do ZIP (PK\x03\x04)
  const headerBytes = await file.slice(0, 4).arrayBuffer();
  const header = new Uint8Array(headerBytes);
  if (header[0] !== 0x50 || header[1] !== 0x4b || header[2] !== 0x03 || header[3] !== 0x04) {
    return NextResponse.json({ error: "Arquivo inválido (não é um ZIP válido)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseImscc(buffer);
  } catch (e) {
    console.error("[imscc.POST] Erro ao parsear:", e);
    return NextResponse.json({ error: "Não foi possível processar o arquivo .imscc" }, { status: 422 });
  }

  // Gerar slug único a partir do título
  const slug = parsed.courseTitle
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const uniqueSlug = `${slug}-${Date.now()}`;

  // Criar curso
  const course = await createCourse(activeTenantId, {
    title: parsed.courseTitle,
    slug: uniqueSlug,
  });

  // Armazena arquivos binários (R2 em prod, disco local em dev sem R2)
  const fileKeyMap = new Map<string, string>();
  for (const [originalPath, fileBuffer] of parsed.files) {
    try {
      const fileName = originalPath.split("/").pop() ?? "arquivo";
      fileKeyMap.set(originalPath, await storeFile(activeTenantId, fileBuffer, fileName));
    } catch (e) {
      console.error("[imscc.POST] Erro ao armazenar arquivo:", originalPath, e);
    }
  }

  // Criar módulos e aulas
  for (const mod of parsed.modules) {
    const createdMod = await createModule(activeTenantId, course.id, { title: mod.title });

    for (const lesson of mod.lessons) {
      const fileKey = lesson.originalFileName
        ? fileKeyMap.get([...parsed.files.keys()].find((k) => k.includes(lesson.originalFileName!)) ?? "") ?? undefined
        : undefined;

      await createLesson(activeTenantId, createdMod.id, {
        title: lesson.title,
        type: lesson.type,
        ...(lesson.content !== undefined && { content: lesson.content }),
        ...(lesson.url !== undefined && { url: lesson.url }),
        ...(fileKey !== undefined && { fileKey }),
      });
    }
  }

  return NextResponse.json({
    courseId: course.id,
    courseTitle: parsed.courseTitle,
    modulesCount: parsed.modules.length,
    lessonsCount: parsed.modules.reduce((a, m) => a + m.lessons.length, 0),
  });
}
