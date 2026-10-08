import type { BoletimData, BoletimStudent, BoletimDisciplinaRow } from "@nexora/db/src/queries/pedagogico";
import type { AvaliacaoConfigRow } from "@nexora/db/src/queries/avaliacoes";

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
/** "padrao": layout genérico do Nexora · "ccc": layout Colégio Caminhos e Colinas. */
export type BoletimTemplate = "padrao" | "ccc";

function periodLabel(i: number, numPeriods: number): string {
  if (numPeriods === 2) return `${i}º Sem.`;
  if (numPeriods === 4) return `${i}º Bim.`;
  return `${i}º Trim.`;
}

function uniqueAVAPeriods(configs: AvaliacaoConfigRow[]): number[] {
  return [...new Set(configs.filter((c) => c.periodo > 0 && !c.isRecuperacao).map((c) => c.periodo))].sort((a, b) => a - b);
}

/**
 * Consolida as frentes na disciplina-mãe, fazendo a média de cada célula (config-agnostic).
 * Se a mãe não está nas linhas (frentes órfãs), cria uma linha sintética.
 */
function consolidateRows(
  rows: BoletimDisciplinaRow[],
  disciplinaNames: Map<string, string> = new Map(),
): BoletimDisciplinaRow[] {
  const byId = new Set(rows.map((r) => r.disciplinaId));
  const frentesByParent = new Map<string, BoletimDisciplinaRow[]>();
  for (const r of rows) {
    if (r.parentId) {
      const arr = frentesByParent.get(r.parentId) ?? [];
      arr.push(r);
      frentesByParent.set(r.parentId, arr);
    }
  }

  function avgRows(sources: BoletimDisciplinaRow[]): Record<string, number | null> {
    const allKeys = new Set(sources.flatMap((s) => Object.keys(s.grades)));
    const grades: Record<string, number | null> = {};
    for (const k of allKeys) {
      const vals = sources.map((s) => s.grades[k]).filter((v): v is number => typeof v === "number");
      grades[k] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null;
    }
    return grades;
  }

  const result: BoletimDisciplinaRow[] = [];

  for (const r of rows) {
    if (r.isFrente) continue;
    const frentes = frentesByParent.get(r.disciplinaId) ?? [];
    if (frentes.length === 0) { result.push(r); continue; }
    const sources = [r, ...frentes];
    result.push({ ...r, grades: avgRows(sources), absences: sources.reduce((a, s) => a + s.absences, 0), isFrente: false });
  }

  // Orphan frentes: group by parentId → one synthetic parent row per group
  const orphansByParent = new Map<string, BoletimDisciplinaRow[]>();
  for (const r of rows) {
    if (r.isFrente && r.parentId && !byId.has(r.parentId)) {
      const arr = orphansByParent.get(r.parentId) ?? [];
      arr.push(r);
      orphansByParent.set(r.parentId, arr);
    }
  }
  for (const [parentId, frentes] of orphansByParent) {
    result.push({
      disciplinaId: parentId,
      name: disciplinaNames.get(parentId) ?? frentes[0]!.name,
      isFrente: false,
      parentId: null,
      grades: avgRows(frentes),
      absences: frentes.reduce((a, f) => a + f.absences, 0),
    });
  }

  return result;
}

interface SchoolHeader {
  name: string;
  cnpj?: string;
  address?: string;
  logoUrl?: string;
}

function computeRowSummary(grades: Record<string, number | null>, configs: AvaliacaoConfigRow[]) {
  const periods = uniqueAVAPeriods(configs);

  const periodAverages = periods.map((p) => {
    const pCfg = configs.filter((c) => c.periodo === p && !c.isRecuperacao && c.tipo !== "SEM_INFLUENCIA" && c.tipo !== "CONCEITO");
    const vals = pCfg.map((c) => ({ score: grades[c.id] ?? null, peso: c.peso ?? 1 })).filter((v) => v.score != null);
    if (vals.length === 0) return null;
    const allEqual = pCfg.every((c) => c.peso == null);
    if (allEqual) return vals.reduce((s, v) => s + v.score!, 0) / vals.length;
    const totalPeso = vals.reduce((s, v) => s + v.peso, 0);
    return totalPeso > 0 ? vals.reduce((s, v) => s + v.score! * v.peso, 0) / totalPeso : null;
  });

  const periodRecoveries = periods.map((p) => {
    const rCfg = configs.filter((c) => c.periodo === p && c.isRecuperacao);
    const vals = rCfg.map((c) => grades[c.id] ?? null).filter((v): v is number => v != null);
    return vals.length > 0 ? Math.max(...vals) : null;
  });

  const recCfg = configs.filter((c) => c.periodo === 0 && c.isRecuperacao);
  const globalRec = recCfg.map((c) => grades[c.id] ?? null).find((v): v is number => v != null) ?? null;

  const pfCfg = configs.filter((c) => c.periodo === 0 && !c.isRecuperacao);
  const globalPf = pfCfg.map((c) => grades[c.id] ?? null).find((v): v is number => v != null) ?? null;

  const effectivePeriods = periodAverages.map((avg, i) => {
    const rec = periodRecoveries[i];
    if (avg == null && rec != null) return rec;
    if (avg != null && rec != null) return Math.max(avg, rec);
    return avg;
  });

  const present = effectivePeriods.filter((v): v is number => v != null);
  const totalPts = present.length > 0 ? Math.round(present.reduce((a, b) => a + b, 0) * 100) / 100 : null;
  let media: number | null = present.length > 0 ? present.reduce((a, b) => a + b, 0) / present.length : null;
  if (media != null && globalRec != null) media = Math.max(media, globalRec);
  if (media != null && globalPf != null) media = (media + globalPf) / 2;

  return {
    periodAverages,
    periodRecoveries,
    globalRec,
    globalPf,
    totalPts,
    media: media != null ? Math.round(media * 100) / 100 : null,
  };
}

/** Classe de cor por faixa de nota (≥7 verde, ≥5 âmbar, <5 vermelho). */
function gradeClass(v: number | null): string {
  if (v == null) return "n-em";
  if (v >= 7) return "n-ok";
  if (v >= 5) return "n-warn";
  return "n-bad";
}

function studentResult(rows: BoletimStudent["rows"], configs: AvaliacaoConfigRow[]): string {
  const medias = rows.map((r) => computeRowSummary(r.grades, configs).media).filter((m): m is number => m != null);
  if (medias.length === 0) return "Aluno Cursando";
  if (medias.some((m) => m < 5)) return "Reprovado";
  if (medias.some((m) => m < 7)) return "Em Recuperação";
  return "Aprovado";
}

function overallMedia(rows: BoletimStudent["rows"], configs: AvaliacaoConfigRow[]): number | null {
  const medias = rows.map((r) => computeRowSummary(r.grades, configs).media).filter((m): m is number => m != null);
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
  const configs = data.configs;
  const periods = uniqueAVAPeriods(configs);
  const numPeriods = periods.length;
  const disciplinaNames = new Map(data.disciplinaOrder.map((d) => [d.id, d.name]));
  const rows = frentes === "media" ? consolidateRows(student.rows, disciplinaNames) : student.rows;
  const totalAbsences = rows.reduce((sum, r) => sum + r.absences, 0);
  const freqPct = Math.max(0, Math.round((1 - totalAbsences / DIAS_LETIVOS) * 100));
  const media = overallMedia(rows, configs);
  const ordinals = ["1ª","2ª","3ª","4ª"];

  const hasGlobalRec = configs.some((c) => c.periodo === 0 && c.isRecuperacao);
  const hasGlobalPf = configs.some((c) => c.periodo === 0 && !c.isRecuperacao);

  const rowsHtml = rows.map((r) => {
    const s = computeRowSummary(r.grades, configs);
    const discCls = r.isFrente ? "td-disc td-frente" : "td-disc";
    return `<tr>
      <td class="${discCls}">${esc(r.name)}</td>
      ${s.periodAverages.map((v) => gradeCell(v)).join("")}
      ${hasGlobalRec ? gradeCell(s.globalRec) : ""}
      <td class="td-num">${s.totalPts != null ? fmt(s.totalPts) : ""}</td>
      ${hasGlobalPf ? gradeCell(s.globalPf) : ""}
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
          ${periods.map((p, i) => `<th>${ordinals[i] ?? `${p}ª`} AVA<br><span style="font-weight:normal;font-size:8px">${periodLabel(p, numPeriods)}</span></th>`).join("")}
          ${hasGlobalRec ? "<th>REC</th>" : ""}
          <th>TOTAL PTS</th>
          ${hasGlobalPf ? "<th>PROVA FINAL</th>" : ""}
          <th>MÉDIA FINAL</th>
          <th>FALTAS</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div class="bol-rodape">
      <div class="bol-rodape-resultado">
        <strong>RESULTADO FINAL:</strong> ${studentResult(rows, configs)}
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

// ─── CCC Template ─────────────────────────────────────────────────────────────

function cccEtapaLabel(turmaCode: string): string {
  if (turmaCode.startsWith("EFAI") || turmaCode.startsWith("EI")) return "Ensino Fundamental 1";
  if (turmaCode.startsWith("EF9")) return "Ensino Fundamental — 9º Ano";
  if (turmaCode.startsWith("EFAF")) return "Ensino Fundamental 2";
  if (turmaCode.startsWith("EM")) return "Ensino Médio";
  return "";
}

function cccPeriodName(i: number, numPeriods: number): string {
  if (numPeriods === 2) return `${i}º Semestre`;
  if (numPeriods === 4) return `${i}º Bimestre`;
  return `${i}º Trimestre`;
}

function cccGradeCell(v: number | null): string {
  const cls = v == null ? "n-em" : v >= 6 ? "n-ok" : v >= 5 ? "n-warn" : "n-bad";
  return `<td class="ccc-td-nota ${cls}">${v != null ? v.toFixed(1).replace(".", ",") : "-"}</td>`;
}

function cccStudentCard(student: BoletimStudent, data: BoletimData, school: SchoolHeader, frentes: BoletimFrentes): string {
  const configs = data.configs;
  const periods = uniqueAVAPeriods(configs);
  const numPeriods = periods.length;
  const disciplinaNames = new Map(data.disciplinaOrder.map((d) => [d.id, d.name]));
  const rows = frentes === "media" ? consolidateRows(student.rows, disciplinaNames) : student.rows;

  const periodHeaders = periods.map((p) =>
    `<th colspan="3" class="ccc-th-group">${cccPeriodName(p, numPeriods)}</th>`
  ).join("");

  const periodSubHeaders = periods.map(() =>
    `<th class="ccc-th-sub">Média<br>Trimestral</th><th class="ccc-th-sub">Média<br>Recuper.</th><th class="ccc-th-sub">Faltas</th>`
  ).join("");

  const rowsHtml = rows.map((r) => {
    const s = computeRowSummary(r.grades, configs);
    const discCls = r.isFrente ? "ccc-td-disc ccc-td-frente" : "ccc-td-disc";
    const periodCells = periods.map((_, i) =>
      `${cccGradeCell(s.periodAverages[i] ?? null)}${cccGradeCell(s.periodRecoveries[i] ?? null)}<td class="ccc-td-falta">-</td>`
    ).join("");
    return `<tr>
      <td class="${discCls}">${esc(r.name)}</td>
      ${periodCells}
      ${cccGradeCell(s.globalRec)}
      <td class="ccc-td-falta">${r.absences || 0}</td>
      ${cccGradeCell(s.media)}
    </tr>`;
  }).join("");

  const etapaLabel = cccEtapaLabel(data.turma.code);
  const logoHtml = school.logoUrl
    ? `<img src="${esc(school.logoUrl)}" alt="Logo" class="ccc-logo-img">`
    : "";


  const resultado = (() => {
    const meds = rows.map((r) => computeRowSummary(r.grades, configs).media).filter((v): v is number => v != null);
    if (meds.length === 0) return "";
    if (meds.some((m) => m < 5)) return "Reprovado";
    if (meds.some((m) => m < 6)) return "Em Recuperação";
    return "Aprovado";
  })();

  const periodWord = numPeriods === 2 ? "semestre" : numPeriods === 4 ? "bimestre" : "trimestre";
  const periodWordNum = ["dois","três","quatro"][numPeriods - 2] ?? String(numPeriods);

  return `<div class="ccc-bol">
    <div class="ccc-hdr">
      <div class="ccc-hdr-logo">${logoHtml}</div>
      <div class="ccc-hdr-text">
        <div class="ccc-hdr-nome">${esc(school.name).toUpperCase()}</div>
        <div class="ccc-hdr-sub">BOLETIM ESCOLAR – ${data.turma.year}</div>
        <div class="ccc-hdr-etapa">${etapaLabel}</div>
      </div>
    </div>

    <div class="ccc-aluno">
      <span class="ccc-al-lbl">Aluno:</span>
      <span class="ccc-al-nome">${esc(student.studentName)}</span>
      <span class="ccc-al-lbl" style="margin-left:24px">Nº</span>
      <span class="ccc-al-val">${student.studentNumber}</span>
      <span class="ccc-al-turma">${esc(data.turma.code)}</span>
    </div>

    <table class="ccc-tbl">
      <thead>
        <tr>
          <th class="ccc-th-disc" rowspan="2">COMPONENTES<br>CURRICULARES</th>
          ${periodHeaders}
          <th class="ccc-th-sub" rowspan="2">Recuper.<br>Final</th>
          <th class="ccc-th-sub" rowspan="2">Total de<br>Faltas</th>
          <th class="ccc-th-sub" rowspan="2">Média<br>Final</th>
        </tr>
        <tr>${periodSubHeaders}</tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div class="ccc-rodape">
      <div class="ccc-pec">
        <div class="ccc-pec-lbl">PEC</div>
        <div class="ccc-pec-val">&nbsp;</div>
      </div>
      <div class="ccc-resultado">
        <div class="ccc-resultado-lbl">RESULTADO FINAL</div>
        <div class="ccc-resultado-val ${resultado === "Aprovado" ? "n-ok" : resultado === "Reprovado" ? "n-bad" : "n-warn"}">${resultado}</div>
      </div>
    </div>

    <div class="ccc-notas">
      <p>1. Todo aluno que obtiver média final mínima 6,0 (seis) em todas as disciplinas e frequência igual ou superior a 75% será considerado promovido.</p>
      <p>2. A média final será calculada considerando peso um para cada ${periodWord}. A somatória dos resultados será dividida por ${numPeriods} (${periodWordNum}).</p>
      <p>3. Terá direito a processo de recuperação o aluno que obtiver média final inferior a 6,0 (seis) em até 3 (três) disciplinas.</p>
      <p>4. Será considerado retido o aluno que, após a recuperação, não obtiver média igual ou superior a 6,0 (seis) nas disciplinas.</p>
      <p>5. EA = Em adaptação. &nbsp;&nbsp; 6. NF = Não frequentou.</p>
    </div>

    <div class="ccc-autorizacao">
      Autorização de funcionamento: Processo SPDOC 1452301/2018 - Publicação em D.O.E. 12/12/2018, Seção I, página 45.<br>
      Autorização de cursos: Ensino Fundamental – anos finais (6º ao 9º ano) e Ensino Médio: Processo Seduc-PRC-2019/02962, de 09/09/2019. Publicação em D.O.E. 20/11/2019, Seção I, página 22
    </div>
  </div>`;

}

const CCC_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background: #fff; }
  .page-break { page-break-after: always; }

  .ccc-bol { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #000; background: #fff;
    width: 794px; margin: 0 auto 16px; border: 1px solid #000; }

  .ccc-hdr { display: flex; align-items: center; border-bottom: 2px solid #000; padding: 8px 12px; gap: 16px; }
  .ccc-hdr-logo { width: 80px; flex-shrink: 0; }
  .ccc-logo-img { max-width: 78px; max-height: 64px; object-fit: contain; }
  .ccc-hdr-text { flex: 1; text-align: center; }
  .ccc-hdr-nome { font-size: 12px; font-weight: bold; }
  .ccc-hdr-sub { font-size: 11px; font-weight: bold; }
  .ccc-hdr-etapa { font-size: 11px; }

  .ccc-aluno { display: flex; align-items: baseline; padding: 5px 8px; border-bottom: 1px solid #000; gap: 4px; font-size: 10px; }
  .ccc-al-lbl { font-weight: normal; }
  .ccc-al-nome { flex: 1; border-bottom: 1px solid #000; min-width: 200px; padding-bottom: 1px; }
  .ccc-al-val { border-bottom: 1px solid #000; min-width: 50px; padding-bottom: 1px; text-align: center; }
  .ccc-al-turma { margin-left: auto; border: 1px solid #000; padding: 1px 8px; font-size: 10px; }

  .ccc-tbl { width: 100%; border-collapse: collapse; }
  .ccc-tbl th, .ccc-tbl td { border: 1px solid #000; text-align: center; vertical-align: middle; font-size: 9px; }
  .ccc-th-disc { text-align: left; width: 24%; padding: 4px 6px; font-size: 9px; font-weight: bold; }
  .ccc-th-group { font-size: 9px; font-weight: bold; padding: 3px 4px; background: #e8e8e8; }
  .ccc-th-sub { font-size: 8px; font-weight: normal; padding: 3px 2px; background: #f4f4f4; line-height: 1.3; }
  .ccc-td-disc { text-align: left; padding: 3px 6px; font-size: 10px; }
  .ccc-td-frente { padding-left: 16px; font-style: italic; font-size: 9px; color: #444; }
  .ccc-td-nota { font-weight: bold; padding: 3px 3px; }
  .ccc-td-falta { padding: 3px 3px; }
  .ccc-tbl tbody tr:nth-child(odd) td { background: #fff; }
  .ccc-tbl tbody tr:nth-child(even) td { background: #f9f9f9; }
  .ccc-tbl tbody tr td.ccc-td-disc, .ccc-tbl tbody tr td.ccc-td-frente { background: inherit; }

  .n-ok { color: #1a6e35; } .n-warn { color: #a05800; } .n-bad { color: #a02020; } .n-em { color: #999; }

  .ccc-rodape { display: flex; border-top: 1px solid #000; }
  .ccc-pec { width: 200px; border-right: 1px solid #000; }
  .ccc-pec-lbl, .ccc-resultado-lbl { font-size: 9px; font-weight: bold; padding: 3px 8px; border-bottom: 1px solid #000; background: #f0f0f0; }
  .ccc-pec-val, .ccc-resultado-val { font-size: 11px; font-weight: bold; padding: 4px 8px; min-height: 22px; }
  .ccc-resultado { flex: 1; }

  .ccc-notas { border-top: 1px solid #000; padding: 5px 8px; font-size: 8px; line-height: 1.6; }
  .ccc-notas p { margin-bottom: 1px; }
  .ccc-autorizacao { border-top: 1px solid #ccc; padding: 3px 8px; font-size: 7px; color: #555; line-height: 1.5; }
`;

export function buildBoletimHtmlCCC(data: BoletimData, school: SchoolHeader, frentes: BoletimFrentes = "avulsas"): string {
  const pages = data.students.map((s) => cccStudentCard(s, data, school, frentes)).join('<div class="page-break"></div>');
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><style>${CCC_CSS}</style></head>
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
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "10mm", bottom: "10mm", left: "8mm", right: "8mm" } });
    return { buffer: Buffer.from(pdf), contentType: "application/pdf", ext: "pdf" };
  } finally {
    await browser.close();
  }
}
