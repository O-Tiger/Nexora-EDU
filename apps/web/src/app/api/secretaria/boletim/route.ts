import { NextResponse } from "next/server";
import { auth } from "@nexora/auth";
import { getBoletimData } from "@nexora/db/src/queries/pedagogico";
import { buildBoletimHtml, renderBoletim, type BoletimFormat, type BoletimFrentes } from "@/lib/boletim";
import { createAuditLog } from "@nexora/db/src/queries/audit";
import { BRAND } from "@nexora/ui";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FORMATS: BoletimFormat[] = ["html", "pdf", "doc"];

async function requireStaff() {
  const session = await auth();
  if (!session) return null;
  const { role } = session.user;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "COORDENADOR" && role !== "PROFESSOR") return null;
  return session;
}

export async function GET(req: Request) {
  const session = await requireStaff();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  const tenantId = session.user.activeTenantId;

  const url = new URL(req.url);
  const turmaId = url.searchParams.get("turmaId");
  const enrollmentId = url.searchParams.get("enrollmentId") ?? undefined;
  const format = (url.searchParams.get("format") ?? "pdf") as BoletimFormat;
  const frentes = (url.searchParams.get("frentes") === "media" ? "media" : "avulsas") as BoletimFrentes;

  if (!turmaId) return NextResponse.json({ error: "turmaId obrigatório" }, { status: 400 });
  if (!FORMATS.includes(format)) return NextResponse.json({ error: "Formato inválido" }, { status: 400 });

  const data = await getBoletimData(tenantId, turmaId, enrollmentId);
  if (!data) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });
  if (data.students.length === 0) {
    return NextResponse.json({ error: "Nenhum aluno ativo na turma" }, { status: 400 });
  }

  const html = buildBoletimHtml(data, {
    name: process.env.NEXT_PUBLIC_SCHOOL_NAME || BRAND.name,
    ...(process.env.SCHOOL_CNPJ && { cnpj: process.env.SCHOOL_CNPJ }),
    ...(process.env.SCHOOL_ADDRESS && { address: process.env.SCHOOL_ADDRESS }),
    ...(process.env.SCHOOL_LOGO_URL && { logoUrl: process.env.SCHOOL_LOGO_URL }),
  }, frentes);

  let rendered;
  try {
    rendered = await renderBoletim(html, format);
  } catch (err) {
    console.error(`[boletim] Render failed: ${err}`);
    return NextResponse.json({ error: "Falha ao gerar o boletim." }, { status: 500 });
  }

  await createAuditLog(tenantId, session.user.id, "secretaria.boletim_generated", `turma:${turmaId}`, {
    format, enrollmentId: enrollmentId ?? "todos", students: data.students.length,
  });

  const filenameBase = enrollmentId
    ? `boletim-${data.turma.code}-aluno`
    : `boletim-${data.turma.code}`;

  const disposition = format === "html" ? "inline" : "attachment";
  return new NextResponse(rendered.buffer as BodyInit, {
    headers: {
      "Content-Type": rendered.contentType,
      "Content-Disposition": `${disposition}; filename="${filenameBase}.${rendered.ext}"`,
    },
  });
}
