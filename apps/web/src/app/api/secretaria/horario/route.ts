import { NextResponse } from "next/server";
import { auth } from "@nexora/auth";
import { getHorarioRenderData } from "@nexora/db/src/queries/horario";
import { buildHorarioHtml, renderHorario, type HorarioFormat } from "@/lib/horario-render";
import { BRAND } from "@nexora/ui";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { role, activeTenantId: tenantId } = session.user;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "COORDENADOR" && role !== "PROFESSOR") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const url = new URL(req.url);
  const turmaId = url.searchParams.get("turmaId");
  const format = (url.searchParams.get("format") === "pdf" ? "pdf" : "html") as HorarioFormat;
  if (!turmaId) return NextResponse.json({ error: "turmaId obrigatório" }, { status: 400 });

  const data = await getHorarioRenderData(tenantId, turmaId);
  if (!data) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });

  const html = buildHorarioHtml({ ...data, schoolName: process.env.NEXT_PUBLIC_SCHOOL_NAME || BRAND.name });

  let rendered;
  try {
    rendered = await renderHorario(html, format);
  } catch (err) {
    console.error(`[horario] Render failed: ${err}`);
    return NextResponse.json({ error: "Falha ao gerar a grade." }, { status: 500 });
  }

  const disposition = format === "html" ? "inline" : "attachment";
  return new NextResponse(rendered.buffer as BodyInit, {
    headers: {
      "Content-Type": rendered.contentType,
      "Content-Disposition": `${disposition}; filename="horario-${data.turma.code}.${rendered.ext}"`,
    },
  });
}
