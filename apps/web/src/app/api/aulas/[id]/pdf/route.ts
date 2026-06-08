import { auth } from "@nexora/auth";
import { NextResponse } from "next/server";
import { prisma } from "@nexora/db";
import { resolveFileUrl, isInlineViewable, extOf } from "@/lib/storage";

// Tempo de cache da presigned URL no cliente: 10 min (abaixo do limite de 15 min)
const CACHE_SECONDS = 10 * 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const lesson = await prisma.lesson.findFirst({
    where: { id, type: "PDF", module: { course: { tenantId: session.user.activeTenantId } } },
    include: {
      module: {
        include: {
          course: {
            include: {
              enrollments: {
                where: { userId: session.user.id, status: "ACTIVE" },
              },
            },
          },
        },
      },
    },
  });

  if (!lesson) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });

  // Verificar matrícula ativa — admin/professor pode acessar sem matrícula
  const { role } = session.user;
  const isStaff = role === "ADMIN" || role === "SUPER_ADMIN" || role === "COORDENADOR" || role === "PROFESSOR";
  const hasEnrollment = lesson.module.course.enrollments.length > 0;

  if (!isStaff && !hasEnrollment) {
    return NextResponse.json({ error: "Sem acesso a este conteúdo" }, { status: 403 });
  }

  if (!lesson.fileKey) {
    return NextResponse.json({ error: "Arquivo não disponível" }, { status: 404 });
  }

  try {
    const url = await resolveFileUrl(lesson.fileKey);
    const ext = extOf(lesson.fileKey) || "pdf";
    const safeTitle = lesson.title.replace(/[^\p{L}\p{N} _.-]/gu, "").trim() || "arquivo";
    return NextResponse.json(
      { url, inline: isInlineViewable(lesson.fileKey), filename: `${safeTitle}.${ext}` },
      { headers: { "Cache-Control": `private, max-age=${CACHE_SECONDS}` } },
    );
  } catch (e) {
    console.error("[aulas.pdf.GET] Erro ao gerar URL:", e);
    return NextResponse.json({ error: "Não foi possível carregar o arquivo" }, { status: 500 });
  }
}
