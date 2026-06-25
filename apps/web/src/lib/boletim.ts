import type { BoletimData, BoletimStudent, BoletimDisciplinaRow } from "@nexora/db/src/queries/pedagogico";

// Puppeteer carregado dinamicamente — fora do bundle client
async function getPuppeteer() {
  const puppeteer = await import("puppeteer");
  return puppeteer.default;
}

// Dias letivos padrão para cálculo de % de frequência (ajustável por escola futuramente)
const DIAS_LETIVOS = 200;

export type BoletimFormat = "html" | "pdf" | "doc";
/** "avulsas": frentes como linhas próprias · "media": consolida frentes na disciplina-mãe. */
export type BoletimFrentes = "avulsas" | "media";

const GRADE_KEYS = ["p1-AVA", "p2-AVA", "p3-AVA", "p0-RECP", "p0-FINAL"] as const;

/** Consolida as frentes na disciplina-mãe, fazendo a média de cada célula. */
function consolidateRows(rows: BoletimDisciplinaRow[]): BoletimDisciplinaRow[] {
  const byId = new Set(rows.map((r) => r.disciplinaId));
  const frentesByParent = new Map<string, BoletimDisciplinaRow[]>();
  for (const r of rows) {
    if (r.parentId) {
      const arr = frentesByParent.get(r.parentId) ?? [];
      arr.push(r);
      frentesByParent.set(r.parentId, arr);
    }
  }

  const result: BoletimDisciplinaRow[] = [];
  for (const r of rows) {
    if (r.isFrente) continue; // tratadas via mãe (ou como órfãs abaixo)
    const frentes = frentesByParent.get(r.disciplinaId) ?? [];
    if (frentes.length === 0) { result.push(r); continue; }

    const sources = [r, ...frentes];
    const grades: Record<string, number | null> = {};
    for (const k of GRADE_KEYS) {
      const vals = sources.map((s) => s.grades[k]).filter((v): v is number => typeof v === "number");
      grades[k] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null;
    }
    const absences = sources.reduce((a, s) => a + s.absences, 0);
    result.push({ ...r, grades, absences, isFrente: false });
  }
  // Frentes órfãs (mãe não vinculada) — mantém como linha própria
  for (const r of rows) {
    if (r.isFrente && !(r.parentId && byId.has(r.parentId))) result.push(r);
  }
  return result;
}

interface SchoolHeader {
  name: string;
  cnpj?: string;
  address?: string;
  logoUrl?: string;
}

/**
 * Resumo de uma disciplina no boletim.
 * Colunas: 1ª/2ª/3ª AVA (trimestres) + REC (recuperação consolidada) + Prova Final.
 * - TOTAL PTS = soma das 3 avaliações presentes
 * - MÉDIA = média das avaliações; a recuperação só eleva (max); prova final entra na média
 *
 * NOTA: a fórmula é um default sensato — ajustável quando a regra exata da escola for definida.
 */
function computeRowSummary(grades: Record<string, number | null>) {
  const a1 = grades["p1-AVA"] ?? null;
  const a2 = grades["p2-AVA"] ?? null;
  const a3 = grades["p3-AVA"] ?? null;
  const rec = grades["p0-RECP"] ?? null;
  const finalProva = grades["p0-FINAL"] ?? null;

  const avas = [a1, a2, a3].filter((v): v is number => v != null);
  const totalPts = avas.length > 0 ? avas.reduce((x, y) => x + y, 0) : null;
  let media: number | null = avas.length > 0 ? avas.reduce((x, y) => x + y, 0) / avas.length : null;
  if (media != null && rec != null) media = Math.max(media, rec); // recuperação só ajuda
  if (media != null && finalProva != null) media = (media + finalProva) / 2;

  return {
    a1, a2, a3, rec, finalProva,
    totalPts,
    media: media != null ? Math.round(media * 100) / 100 : null,
  };
}

/** Classe de cor por faixa de nota (igual ao gerador: ≥7 verde, ≥5 âmbar, <5 vermelho). */
function gradeClass(v: number | null): string {
  if (v == null) return "n-em";
  if (v >= 7) return "n-ok";
  if (v >= 5) return "n-warn";
  return "n-bad";
}

/** Resultado do aluno a partir das médias das disciplinas. */
function studentResult(rows: BoletimStudent["rows"]): string {
  const medias = rows.map((r) => computeRowSummary(r.grades).media).filter((m): m is number => m != null);
  if (medias.length === 0) return "Aluno Cursando";
  if (medias.some((m) => m < 5)) return "Reprovado";
  if (medias.some((m) => m < 7)) return "Em Recuperação";
  return "Aprovado";
}

/** Média geral do aluno (média das médias das disciplinas). */
function overallMedia(rows: BoletimStudent["rows"]): number | null {
  const medias = rows.map((r) => computeRowSummary(r.grades).media).filter((m): m is number => m != null);
  if (medias.length === 0) return null;
  return Math.round((medias.reduce((a, b) => a + b, 0) / medias.length) * 100) / 100;
}

function fmt(v: number | null): string {
  return v == null ? "" : v.toFixed(2).replace(".", ",");
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

/** Célula de nota com cor por faixa. */
function gradeCell(v: number | null, extraClass = ""): string {
  return `<td class="td-nota ${gradeClass(v)} ${extraClass}">${fmt(v)}</td>`;
}

function studentCard(student: BoletimStudent, data: BoletimData, school: SchoolHeader, frentes: BoletimFrentes): string {
  const rows = frentes === "media" ? consolidateRows(student.rows) : student.rows;
  const totalAbsences = rows.reduce((sum, r) => sum + r.absences, 0);
  const freqPct = Math.max(0, Math.round((1 - totalAbsences / DIAS_LETIVOS) * 100));
  const media = overallMedia(rows);

  const rowsHtml = rows.map((r) => {
    const s = computeRowSummary(r.grades);
    const discCls = r.isFrente ? "td-disc td-frente" : "td-disc";
    return `<tr>
      <td class="${discCls}">${esc(r.name)}</td>
      ${gradeCell(s.a1)}
      ${gradeCell(s.a2)}
      ${gradeCell(s.a3)}
      ${gradeCell(s.rec)}
      <td class="td-num">${s.totalPts != null ? fmt(s.totalPts) : ""}</td>
      ${gradeCell(s.finalProva)}
      ${gradeCell(s.media, "td-media")}
      <td class="td-num">${r.absences || 0}</td>
    </tr>`;
  }).join("");

  const logoHTML = school.logoUrl
    ? `<img src="${esc(school.logoUrl)}" alt="Logo da escola">`
    : `<div class="bol-hdr-logo-ph">🏫<br>Logo</div>`;

  return `<div class="bol">
    <div class="bol-hdr">
      <div class="bol-hdr-logo">${logoHTML}</div>
      <div class="bol-hdr-info">
        <div class="bol-hdr-nome">${esc(school.name).toUpperCase()}</div>
        <div class="bol-hdr-detalhe">
          ${school.cnpj ? `CNPJ: ${esc(school.cnpj)}<br>` : ""}
          ${school.address ? `${esc(school.address)}` : ""}
        </div>
      </div>
    </div>

    <div class="bol-titulo">Boletim Escolar - Anual</div>

    <div class="bol-aluno">
      <div class="bol-aluno-linha">
        <span class="al-lbl">NOME</span>
        <span class="al-val al-val-nome">${esc(student.studentName)}</span>
        <span class="al-lbl">Nº ORDEM</span>
        <span class="al-val al-val-ord">${student.studentNumber}</span>
      </div>
      <div class="bol-aluno-linha">
        <span class="al-lbl">TURMA</span>
        <span class="al-val al-val-tm">${esc(data.turma.code)}</span>
        <span class="al-lbl">TURNO</span>
        <span class="al-val al-val-trn">${esc(data.turma.period)}</span>
        <span class="al-lbl">ANO LETIVO</span>
        <span class="al-val al-val-ano">${data.turma.year}</span>
      </div>
    </div>

    <table class="bol-tbl">
      <thead>
        <tr>
          <th class="th-disc">DISCIPLINAS</th>
          <th>1ª AVA</th>
          <th>2ª AVA</th>
          <th>3ª AVA</th>
          <th>REC</th>
          <th>TOTAL PTS</th>
          <th>PROVA FINAL</th>
          <th>MÉDIA FINAL</th>
          <th>FALTAS</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div class="bol-rodape">
      <div class="bol-rodape-resultado">
        <strong>RESULTADO FINAL:</strong> ${studentResult(rows)}
        &nbsp;&nbsp;&nbsp;
        <strong>FALTAS ACUMULADAS:</strong> ${totalAbsences}
        &nbsp;&nbsp;&nbsp;
        <strong>% FREQ.:</strong> ${freqPct}
      </div>
      <div class="bol-rodape-media ${gradeClass(media)}">
        MÉDIA GERAL: ${media != null ? fmt(media) : "—"}
      </div>
    </div>
  </div>`;
}

const BOL_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background: #eef2f8; }
  .bol { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; background: #fff;
    width: 794px; margin: 0 auto 16px; border: 1px solid #888; }
  .page-break { page-break-after: always; }

  .bol-hdr { display: flex; border-bottom: 2px solid #1a3557; min-height: 72px; }
  .bol-hdr-logo { width: 100px; display: flex; align-items: center; justify-content: center;
    padding: 8px 10px; border-right: 1px solid #aaa; flex-shrink: 0; }
  .bol-hdr-logo img { max-width: 82px; max-height: 58px; object-fit: contain; }
  .bol-hdr-logo-ph { font-size: 11px; color: #aaa; text-align: center; line-height: 1.5; }
  .bol-hdr-info { padding: 9px 14px; display: flex; flex-direction: column; justify-content: center; gap: 3px; }
  .bol-hdr-nome { font-size: 13px; font-weight: bold; color: #1a3557; }
  .bol-hdr-detalhe { font-size: 10px; color: #333; line-height: 1.6; }

  .bol-titulo { text-align: center; font-size: 15px; font-weight: bold; padding: 7px 0;
    border-bottom: 2px solid #1a3557; background: #eef2f8; letter-spacing: .02em; color: #1a3557; }

  .bol-aluno { padding: 6px 10px; border-bottom: 1px solid #888; display: flex; flex-direction: column; gap: 5px; }
  .bol-aluno-linha { display: flex; align-items: baseline; flex-wrap: nowrap; }
  .al-lbl { font-weight: bold; font-size: 10px; white-space: nowrap; margin-right: 5px; color: #5a6a7e; }
  .al-val { font-size: 11px; border-bottom: 1px solid #666; padding-bottom: 1px; margin-right: 18px; min-width: 60px; }
  .al-val-nome { min-width: 280px; }
  .al-val-ord { min-width: 40px; }
  .al-val-tm { min-width: 110px; }
  .al-val-trn { min-width: 90px; }
  .al-val-ano { min-width: 50px; margin-right: 0; }

  .bol-tbl { width: 100%; border-collapse: collapse; }
  .bol-tbl thead tr th { border: 1px solid #777; padding: 5px 4px; text-align: center;
    font-size: 9px; font-weight: bold; background: #1a3557; color: #fff; line-height: 1.3; }
  .bol-tbl thead tr th.th-disc { text-align: left; width: 30%; }
  .bol-tbl tbody tr td { border: 1px solid #ccc; padding: 4px 5px; font-size: 11px; vertical-align: middle; text-align: center; }
  .bol-tbl tbody tr:nth-child(odd) td { background: #fff; }
  .bol-tbl tbody tr:nth-child(even) td { background: #f4f7fb; }
  .bol-tbl tbody tr td.td-disc { text-align: left; font-weight: 600; }
  .bol-tbl tbody tr td.td-frente { padding-left: 20px; font-weight: 400; font-style: italic; color: #5a6a7e; }
  .bol-tbl tbody tr td.td-nota { font-weight: bold; }
  .bol-tbl tbody tr td.td-media { font-size: 12px; }
  .bol-tbl tbody tr td.td-num { color: #1e2a3a; }

  .n-ok { color: #1a6e35; } .n-warn { color: #a05800; } .n-bad { color: #a02020; } .n-em { color: #bbb; }

  .bol-rodape { border-top: 2px solid #1a3557; padding: 6px 10px; background: #eef2f8;
    display: flex; justify-content: space-between; align-items: center; font-size: 10px; gap: 12px; flex-wrap: wrap; }
  .bol-rodape-resultado { font-size: 10px; color: #1e2a3a; }
  .bol-rodape-media { font-size: 12px; font-weight: bold; }
`;

export function buildBoletimHtml(data: BoletimData, school: SchoolHeader, frentes: BoletimFrentes = "avulsas"): string {
  const pages = data.students.map((s) => studentCard(s, data, school, frentes)).join('<div class="page-break"></div>');
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><style>${BOL_CSS}</style></head>
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
