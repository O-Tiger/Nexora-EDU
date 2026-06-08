import { prisma } from "@nexora/db";
import { buildFileKey } from "./r2";

// Puppeteer carregado dinamicamente — não incluir no bundle do client
async function getPuppeteer() {
  const puppeteer = await import("puppeteer");
  return puppeteer.default;
}

interface CertificateData {
  studentName: string;
  courseName: string;
  hoursTotal: number;
  issuedAt: Date;
  code: string;
  institutionName: string;
}

function buildCertificateHtml(data: CertificateData): string {
  const date = data.issuedAt.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1123px; height: 794px;
    font-family: Georgia, serif;
    background: linear-gradient(135deg, #1A3A5C 0%, #0D9488 100%);
    display: flex; align-items: center; justify-content: center;
  }
  .cert {
    background: white;
    width: 1040px; height: 710px;
    border-radius: 16px;
    padding: 60px 80px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center;
    position: relative;
    border: 8px solid #0D9488;
  }
  .institution { font-size: 14px; color: #64748b; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px; }
  .title { font-size: 42px; color: #1A3A5C; font-weight: bold; margin-bottom: 8px; }
  .subtitle { font-size: 18px; color: #475569; margin-bottom: 40px; }
  .certifies { font-size: 14px; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; }
  .student { font-size: 36px; color: #0D9488; font-weight: bold; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 24px; min-width: 500px; }
  .course-label { font-size: 14px; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
  .course { font-size: 22px; color: #1A3A5C; font-weight: bold; margin-bottom: 8px; }
  .hours { font-size: 14px; color: #64748b; margin-bottom: 40px; }
  .date { font-size: 14px; color: #64748b; margin-bottom: 20px; }
  .code { font-size: 11px; color: #94a3b8; font-family: monospace; }
</style>
</head>
<body>
<div class="cert">
  <p class="institution">${data.institutionName}</p>
  <h1 class="title">Certificado de Conclusão</h1>
  <p class="certifies">Certificamos que</p>
  <p class="student">${data.studentName}</p>
  <p class="course-label">concluiu com êxito o curso</p>
  <p class="course">${data.courseName}</p>
  <p class="hours">Carga horária: ${data.hoursTotal}h</p>
  <p class="date">${date}</p>
  <p class="code">Código de validação: ${data.code}</p>
</div>
</body>
</html>`;
}

/**
 * Gera o PDF do certificado e retorna o buffer.
 * Chamado apenas server-side (Node.js runtime).
 */
export async function generateCertificatePdf(data: CertificateData): Promise<Buffer> {
  const puppeteer = await getPuppeteer();
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(buildCertificateHtml(data), { waitUntil: "networkidle0" });
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
