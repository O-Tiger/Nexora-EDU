import { prisma } from "@nexora/db";

// Puppeteer carregado dinamicamente — não incluir no bundle do client
async function getPuppeteer() {
  const puppeteer = await import("puppeteer");
  return puppeteer.default;
}

export interface CertificateData {
  studentName: string;
  courseName: string;
  hoursTotal: number;
  issuedAt: Date;
  code: string;
  institutionName: string;
  studentCpf?: string | null;
}

export interface CertificateSignature {
  name: string;
  role: string;
  document?: string;
}

export interface CertificateTemplateConfig {
  institutionName: string;
  subtitle?: string | null;
  title: string;
  bodyTemplate: string;
  signatures: CertificateSignature[];
  logoUrl?: string | null;
  city?: string | null;
  accentColor: string;
}

/** Template padrão usado quando o tenant ainda não customizou. */
export function defaultCertificateTemplate(institutionName: string): CertificateTemplateConfig {
  return {
    institutionName,
    subtitle: null,
    title: "CERTIFICADO",
    bodyTemplate:
      "{{cpf}}concluiu o curso de <strong>{{course}}</strong>, promovido por esta entidade em {{date}}, com carga horária total de {{hours}} horas.",
    signatures: [{ name: "", role: "Diretor(a) Geral" }, { name: "", role: "Secretário(a)" }],
    logoUrl: null,
    city: null,
    accentColor: "#0D9488",
  };
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function renderTemplateString(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) => (k in vars ? vars[k]! : ""));
}

export function buildCertificateHtml(data: CertificateData, tpl: CertificateTemplateConfig): string {
  const date = data.issuedAt.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const accent = tpl.accentColor || "#0D9488";

  const body = renderTemplateString(tpl.bodyTemplate, {
    name: esc(data.studentName),
    course: esc(data.courseName),
    hours: String(data.hoursTotal),
    date,
    code: esc(data.code),
    city: esc(tpl.city ?? ""),
    cpf: data.studentCpf ? `CPF ${esc(data.studentCpf)} ` : "",
  });

  const cityLine = tpl.city ? `${esc(tpl.city)}, ${date}.` : `${date}.`;

  const sigs = (tpl.signatures ?? []).filter((s) => s.role || s.name);
  const sigHtml = sigs.length
    ? `<div class="sigs">${sigs.map((s) => `
        <div class="sig">
          <div class="line"></div>
          ${s.name ? `<div class="sig-name">${esc(s.name)}</div>` : ""}
          ${s.document ? `<div class="sig-doc">${esc(s.document)}</div>` : ""}
          <div class="sig-role">${esc(s.role)}</div>
        </div>`).join("")}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1123px; height: 794px; font-family: Georgia, 'Times New Roman', serif;
    background: #fff; display: flex; align-items: center; justify-content: center; }
  .cert { width: 1083px; height: 754px; padding: 48px 72px; border: 10px solid ${accent};
    display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; }
  .logo { max-height: 90px; margin-bottom: 12px; }
  .institution { font-size: 20px; color: #1a2b3c; font-weight: bold; }
  .subtitle { font-size: 12px; color: #64748b; margin-top: 6px; max-width: 760px; line-height: 1.4; }
  .title { font-size: 40px; color: ${accent}; font-weight: bold; letter-spacing: 2px; margin: 24px 0 18px; }
  .certifies { font-size: 14px; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; }
  .student { font-size: 34px; color: #1a2b3c; font-weight: bold; margin-bottom: 22px; }
  .body { font-size: 17px; color: #334155; line-height: 1.7; max-width: 820px; margin-bottom: 36px; }
  .city { font-size: 15px; color: #334155; margin-bottom: 48px; }
  .sigs { display: flex; gap: 64px; justify-content: center; margin-top: auto; }
  .sig { min-width: 220px; }
  .sig .line { border-top: 1px solid #334155; margin-bottom: 6px; }
  .sig-name { font-size: 14px; font-weight: bold; color: #1a2b3c; }
  .sig-doc { font-size: 11px; color: #64748b; }
  .sig-role { font-size: 12px; color: #475569; }
  .code { position: absolute; bottom: 14px; right: 24px; font-size: 10px; color: #94a3b8; font-family: monospace; }
</style></head>
<body>
<div class="cert">
  ${tpl.logoUrl ? `<img class="logo" src="${esc(tpl.logoUrl)}" alt="logo" />` : ""}
  <div class="institution">${esc(tpl.institutionName)}</div>
  ${tpl.subtitle ? `<div class="subtitle">${esc(tpl.subtitle)}</div>` : ""}
  <h1 class="title">${esc(tpl.title)}</h1>
  <p class="certifies">Certifica que</p>
  <p class="student">${esc(data.studentName)}</p>
  <p class="body">${body}</p>
  <p class="city">${cityLine}</p>
  ${sigHtml}
  <span class="code">Validação: ${esc(data.code)}</span>
</div>
</body></html>`;
}

/** Carrega o template do tenant ou retorna o padrão. */
export async function getCertificateTemplate(
  tenantId: string,
  fallbackInstitution: string,
): Promise<CertificateTemplateConfig> {
  const row = await prisma.certificateTemplate.findUnique({ where: { tenantId } });
  if (!row) return defaultCertificateTemplate(fallbackInstitution);
  return {
    institutionName: row.institutionName,
    subtitle: row.subtitle,
    title: row.title,
    bodyTemplate: row.bodyTemplate,
    signatures: (row.signatures as unknown as CertificateSignature[]) ?? [],
    logoUrl: row.logoUrl,
    city: row.city,
    accentColor: row.accentColor,
  };
}

/**
 * Gera o PDF do certificado e retorna o buffer.
 * Chamado apenas server-side (Node.js runtime).
 */
export async function generateCertificatePdf(
  data: CertificateData,
  tpl?: CertificateTemplateConfig,
): Promise<Buffer> {
  const puppeteer = await getPuppeteer();
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  const template = tpl ?? defaultCertificateTemplate(data.institutionName);

  const browser = await puppeteer.launch({
    headless: true,
    ...(executablePath !== undefined && { executablePath }),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(buildCertificateHtml(data, template), { waitUntil: "networkidle0" });
    await page.setViewport({ width: 1123, height: 794 });

    const pdfBuffer = await page.pdf({
      width: "1123px",
      height: "794px",
      printBackground: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/**
 * Verifica se o aluno já completou o curso (100% das aulas).
 * Retorna a enrollment se completada, null caso contrário.
 */
export async function checkCourseCompletion(userId: string, courseId: string, tenantId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, courseId, tenantId, status: "ACTIVE" },
    include: {
      course: {
        include: { modules: { include: { lessons: { select: { id: true } } } } },
      },
      progress: { where: { completed: true }, select: { lessonId: true } },
    },
  });

  if (!enrollment) return null;

  const totalLessons = enrollment.course.modules.reduce((a, m) => a + m.lessons.length, 0);
  if (totalLessons === 0) return null;

  const completed = enrollment.progress.length;
  if (completed < totalLessons) return null;

  return enrollment;
}

export async function getOrCreateCertificate(
  userId: string,
  courseId: string,
  tenantId: string,
  enrollmentId: string,
) {
  // Verificar se já existe
  const existing = await prisma.certificate.findFirst({
    where: { userId, courseId, tenantId },
  });
  if (existing) return existing;

  // Criar novo certificado
  const code = crypto.randomUUID().replace(/-/g, "").toUpperCase().slice(0, 12);
  return prisma.certificate.create({
    data: { userId, courseId, tenantId, enrollmentId, code },
  });
}
