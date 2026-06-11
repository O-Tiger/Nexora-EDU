import type { BoletimData, BoletimStudent } from "@nexora/db/src/queries/pedagogico";

// Puppeteer carregado dinamicamente — fora do bundle client
async function getPuppeteer() {
  const puppeteer = await import("puppeteer");
  return puppeteer.default;
}

const PASSING_SCORE = 6;
// Dias letivos padrão para cálculo de % de frequência (ajustável por escola futuramente)
const DIAS_LETIVOS = 200;

export type BoletimFormat = "html" | "pdf" | "doc";

interface SchoolHeader {
  name: string;
  cnpj?: string;
  address?: string;
}

/** Melhor nota de um trimestre: max(AVA, RECP) quando ambas existem. */
function trimestreScore(grades: Record<string, number | null>, period: number): number | null {
  const ava = grades[`p${period}-AVA`];
  const recp = grades[`p${period}-RECP`];
  const vals = [ava, recp].filter((v): v is number => typeof v === "number");
  if (vals.length === 0) return null;
  return Math.max(...vals);
}

function computeRowSummary(grades: Record<string, number | null>) {
  const t1 = trimestreScore(grades, 1);
  const t2 = trimestreScore(grades, 2);
  const t3 = trimestreScore(grades, 3);
  const finalProva = grades["p0-FINAL"] ?? null;
  const present = [t1, t2, t3].filter((v): v is number => v != null);
  const totalPts = present.reduce((a, b) => a + b, 0);
  let media: number | null = present.length > 0 ? totalPts / present.length : null;
  if (finalProva != null && media != null) media = (media + finalProva) / 2;
  return {
    t1, t2, t3, finalProva,
    totalPts: present.length > 0 ? totalPts : null,
    media: media != null ? Math.round(media * 100) / 100 : null,
  };
}

function studentResult(rows: BoletimStudent["rows"]): string {
  const medias = rows
    .map((r) => computeRowSummary(r.grades).media)
    .filter((m): m is number => m != null);
  if (medias.length === 0) return "Aluno Cursando";
  const allPass = medias.every((m) => m >= PASSING_SCORE);
  return allPass ? "Aprovado" : "Reprovado";
}

function fmt(v: number | null): string {
  return v == null ? "" : v.toFixed(2).replace(/\.00$/, "");
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function studentTable(student: BoletimStudent, data: BoletimData, school: SchoolHeader): string {
  const freqPct = Math.max(0, Math.round((1 - student.totalAbsences / DIAS_LETIVOS) * 100));
  const rowsHtml = student.rows.map((r) => {
    const s = computeRowSummary(r.grades);
    const cls = r.isFrente ? ' class="frente"' : "";
    return `<tr${cls}>
      <td class="disc">${esc(r.name)}</td>
      <td>${fmt(r.grades["p1-AVA"] ?? null)}</td>
      <td>${fmt(r.grades["p1-RECP"] ?? null)}</td>
      <td>${fmt(r.grades["p2-AVA"] ?? null)}</td>
      <td>${fmt(r.grades["p2-RECP"] ?? null)}</td>
      <td>${fmt(r.grades["p3-AVA"] ?? null)}</td>
      <td>${fmt(r.grades["p3-RECP"] ?? null)}</td>
      <td>${fmt(s.totalPts)}</td>
      <td>${fmt(s.finalProva)}</td>
      <td class="media">${fmt(s.media)}</td>
      <td>${r.absences || 0}</td>
    </tr>`;
  }).join("");

  return `<section class="boletim">
  <header class="head">
    <div class="school">
      <strong>${esc(school.name)}</strong>
      ${school.cnpj ? `<div>CNPJ: ${esc(school.cnpj)}</div>` : ""}
      ${school.address ? `<div>${esc(school.address)}</div>` : ""}
    </div>
    <h1>Boletim Escolar — Trimestral</h1>
  </header>

  <div class="student-info">
    <div><span>NOME</span> ${esc(student.studentName)}</div>
    <div><span>Nº ORDEM</span> ${student.studentNumber}</div>
    <div><span>TURMA</span> ${esc(data.turma.code)}</div>
    <div><span>TURNO</span> ${esc(data.turma.period)}</div>
    <div><span>ANO LETIVO</span> ${data.turma.year}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="disc">DISCIPLINAS</th>
        <th>1ª AVA</th><th>1ª REC</th>
        <th>2ª AVA</th><th>2ª REC</th>
        <th>3ª AVA</th><th>3ª REC</th>
        <th>TOTAL PTS</th><th>PROVA FINAL</th><th>MÉDIA FINAL</th><th>FALTAS</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <footer class="result">
    <div><span>RESULTADO FINAL:</span> ${studentResult(student.rows)}</div>
    <div><span>FALTAS ACUMULADAS:</span> ${student.totalAbsences}</div>
    <div><span>% FREQ.:</span> ${freqPct}</div>
  </footer>
</section>`;
}

export function buildBoletimHtml(data: BoletimData, school: SchoolHeader): string {
  const pages = data.students.map((s) => studentTable(s, data, school)).join('<div class="page-break"></div>');
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a2b3c; margin: 0; padding: 0; font-size: 11px; }
  .boletim { padding: 24px 28px; }
  .page-break { page-break-after: always; }
  .head { border: 1px solid #333; padding: 10px 12px; margin-bottom: 12px; }
  .head .school { font-size: 11px; line-height: 1.4; }
  .head h1 { font-size: 16px; text-align: center; margin: 8px 0 0; }
  .student-info { display: flex; flex-wrap: wrap; gap: 6px 24px; margin-bottom: 10px; font-size: 11px; }
  .student-info span { color: #667; font-weight: bold; margin-right: 4px; font-size: 9px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #999; padding: 3px 5px; text-align: center; }
  th { background: #f0f3f6; font-size: 9px; font-weight: bold; }
  td.disc, th.disc { text-align: left; width: 28%; }
  td.media { font-weight: bold; }
  tr.frente td.disc { padding-left: 18px; color: #556; font-style: italic; }
  .result { display: flex; gap: 24px; border: 1px solid #333; border-top: none; padding: 6px 12px; font-size: 11px; }
  .result span { font-weight: bold; }
</style></head>
<body>${pages}</body></html>`;
}

/**
 * Renderiza o boletim no formato escolhido.
 * - html: o próprio HTML (text/html)
 * - pdf:  via Puppeteer (application/pdf)
 * - doc:  HTML com MIME do Word — abre no Word/Docs (application/msword)
 */
export async function renderBoletim(
  html: string,
  format: BoletimFormat,
): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  if (format === "html") {
    return { buffer: Buffer.from(html, "utf-8"), contentType: "text/html; charset=utf-8", ext: "html" };
  }
  if (format === "doc") {
    return { buffer: Buffer.from(html, "utf-8"), contentType: "application/msword", ext: "doc" };
  }
  // pdf
  const puppeteer = await getPuppeteer();
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  const browser = await puppeteer.launch({
    headless: true,
    ...(executablePath !== undefined && { executablePath }),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "10mm", bottom: "10mm", left: "8mm", right: "8mm" } });
    return { buffer: Buffer.from(pdf), contentType: "application/pdf", ext: "pdf" };
  } finally {
    await browser.close();
  }
}
