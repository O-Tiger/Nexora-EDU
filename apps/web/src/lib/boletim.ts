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

function gradeKeys(periodos: number): string[] {
  return [
    ...Array.from({ length: periodos }, (_, i) => `p${i + 1}-AVA`),
    "p0-RECP",
    "p0-FINAL",
  ];
}

function periodLabel(i: number, periodos: number): string {
  if (periodos === 2) return `${i}º Sem.`;
  if (periodos === 4) return `${i}º Bim.`;
  return `${i}º Trim.`;
}

/** Consolida as frentes na disciplina-mãe, fazendo a média de cada célula. */
function consolidateRows(rows: BoletimDisciplinaRow[], periodos: number): BoletimDisciplinaRow[] {
  const keys = gradeKeys(periodos);
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
    if (r.isFrente) continue;
    const frentes = frentesByParent.get(r.disciplinaId) ?? [];
    if (frentes.length === 0) { result.push(r); continue; }

    const sources = [r, ...frentes];
    const grades: Record<string, number | null> = {};
    for (const k of keys) {
      const vals = sources.map((s) => s.grades[k]).filter((v): v is number => typeof v === "number");
      grades[k] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null;
    }
    const absences = sources.reduce((a, s) => a + s.absences, 0);
    result.push({ ...r, grades, absences, isFrente: false });
  }
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

function computeRowSummary(grades: Record<string, number | null>, periodos: number) {
  const avas = Array.from({ length: periodos }, (_, i) => grades[`p${i + 1}-AVA`] ?? null);
  const rec = grades["p0-RECP"] ?? null;
  const finalProva = grades["p0-FINAL"] ?? null;

  const present = avas.filter((v): v is number => v != null);
  const totalPts = present.length > 0 ? present.reduce((x, y) => x + y, 0) : null;
  let media: number | null = present.length > 0 ? present.reduce((x, y) => x + y, 0) / present.length : null;
  if (media != null && rec != null) media = Math.max(media, rec);
  if (media != null && finalProva != null) media = (media + finalProva) / 2;

  return {
    avas,
    rec,
    finalProva,
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

function studentResult(rows: BoletimStudent["rows"], periodos: number): string {
  const medias = rows.map((r) => computeRowSummary(r.grades, periodos).media).filter((m): m is number => m != null);
  if (medias.length === 0) return "Aluno Cursando";
  if (medias.some((m) => m < 5)) return "Reprovado";
  if (medias.some((m) => m < 7)) return "Em Recuperação";
  return "Aprovado";
}

function overallMedia(rows: BoletimStudent["rows"], periodos: number): number | null {
  const medias = rows.map((r) => computeRowSummary(r.grades, periodos).media).filter((m): m is number => m != null);
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

function studentCard(student: BoletimStudent, data: BoletimData, school: SchoolHeader, frentes: BoletimFrentes, periodos: number): string {
  const rows = frentes === "media" ? consolidateRows(student.rows, periodos) : student.rows;
  const totalAbsences = rows.reduce((sum, r) => sum + r.absences, 0);
  const freqPct = Math.max(0, Math.round((1 - totalAbsences / DIAS_LETIVOS) * 100));
  const media = overallMedia(rows, periodos);

  const rowsHtml = rows.map((r) => {
    const s = computeRowSummary(r.grades, periodos);
    const discCls = r.isFrente ? "td-disc td-frente" : "td-disc";
    return `<tr>
      <td class="${discCls}">${esc(r.name)}</td>
      ${s.avas.map((v) => gradeCell(v)).join("")}
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
          ${Array.from({ length: periodos }, (_, i) => `<th>${["1ª","2ª","3ª","4ª"][i]} AVA<br><span style="font-weight:normal;font-size:8px">${periodLabel(i + 1, periodos)}</span></th>`).join("")}
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
        <strong>RESULTADO FINAL:</strong> ${studentResult(rows, periodos)}
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

export function buildBoletimHtml(data: BoletimData, school: SchoolHeader, frentes: BoletimFrentes = "avulsas", periodos = 3): string {
  const pages = data.students.map((s) => studentCard(s, data, school, frentes, periodos)).join('<div class="page-break"></div>');
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
