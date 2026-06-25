import { NextResponse } from "next/server";
import { auth } from "@nexora/auth";
import { getBoletimData } from "@nexora/db/src/queries/pedagogico";
import { buildBoletimHtml, renderBoletim, type BoletimFormat } from "@/lib/boletim";
import { getFilhosFromSession } from "@/lib/responsavel";
import { getTenantConfig } from "@nexora/db/src/queries/administracao";
import { BRAND } from "@nexora/ui";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FORMATS: BoletimFormat[] = ["html", "pdf", "doc"];

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  if (session.user.role !== "RESPONSIBLE") return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const tenantId = session.user.activeTenantId;
  const url = new URL(req.url);
  const turmaId = url.searchParams.get("turmaId");
  const enrollmentId = url.searchParams.get("enrollmentId") ?? undefined;
  const format = (url.searchParams.get("format") ?? "pdf") as BoletimFormat;

  if (!turmaId) return NextResponse.json({ error: "turmaId obrigatório" }, { status: 400 });
  if (!FORMATS.includes(format)) return NextResponse.json({ error: "Formato inválido" }, { status: 400 });

  // IDOR guard — verify this turmaId belongs to one of their children
  const filhos = await getFilhosFromSession(session.user.id, tenantId);
  const pertenceAoFilho = filhos.some((f) => f.turmaId === turmaId);
  if (!pertenceAoFilho) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const [data, tenantConfig] = await Promise.all([
    getBoletimData(tenantId, turmaId, enrollmentId),
    getTenantConfig(tenantId),
  ]);
  if (!data) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });
  if (data.students.length === 0) return NextResponse.json({ error: "Sem dados de notas" }, { status: 400 });

  const periodos = tenantConfig?.periodos ?? 3;
  const html = buildBoletimHtml(data, {
    name: tenantConfig?.schoolName || process.env.NEXT_PUBLIC_SCHOOL_NAME || BRAND.name,
    ...(tenantConfig?.cnpj && { cnpj: tenantConfig.cnpj }),
    ...(tenantConfig?.schoolAddress && { address: tenantConfig.schoolAddress }),
    ...(tenantConfig?.logoUrl && { logoUrl: tenantConfig.logoUrl }),
  }, "avulsas", periodos);

  let rendered;
  try {
    rendered = await renderBoletim(html, format);
  } catch (err) {
    console.error(`[responsavel/boletim] Render failed: ${err}`);
    return NextResponse.json({ error: "Falha ao gerar o boletim." }, { status: 500 });
  }

  const filenameBase = `boletim-${data.turma.code}`;
  const disposition = format === "html" ? "inline" : "attachment";
  return new NextResponse(rendered.buffer as BodyInit, {
    headers: {
      "Content-Type": rendered.contentType,
      "Content-Disposition": `${disposition}; filename="${filenameBase}.${rendered.ext}"`,
    },
  });
}
