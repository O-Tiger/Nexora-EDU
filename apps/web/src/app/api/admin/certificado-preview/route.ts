import { NextResponse } from "next/server";
import { auth } from "@nexora/auth";
import {
  buildCertificateHtml, generateCertificatePdf, getCertificateTemplate,
} from "@/lib/certificate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Preview do certificado com dados de exemplo, usando o template salvo do tenant. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { role, activeTenantId } = session.user;
  if (role !== "ADMINISTRATOR" && role !== "OWNER" && role !== "ASSISTANT") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const format = new URL(req.url).searchParams.get("format") ?? "html";
  const fallback = activeTenantId === "inst_a" ? "Faculdade Nexora" : "Colégio Nexora";
  const template = await getCertificateTemplate(activeTenantId, fallback);

  const sample = {
    studentName: "Maria Eduarda da Silva",
    courseName: "Pós-graduação em Gestão de Recursos Humanos",
    hoursTotal: 1648,
    issuedAt: new Date(),
    code: "EXEMPLO12345",
    institutionName: template.institutionName,
    studentCpf: "000.000.000-00",
  };

  if (format === "pdf") {
    try {
      const pdf = await generateCertificatePdf(sample, template);
      return new NextResponse(pdf as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="certificado-exemplo.pdf"',
        },
      });
    } catch (err) {
      console.error(`[certificado-preview] PDF falhou: ${err}`);
      return NextResponse.json({ error: "Falha ao gerar PDF" }, { status: 500 });
    }
  }

  const html = buildCertificateHtml(sample, template);
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
