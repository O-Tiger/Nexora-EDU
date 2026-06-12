// Render da grade de horários em HTML/PDF, no estilo colorido da referência.

async function getPuppeteer() {
  const puppeteer = await import("puppeteer");
  return puppeteer.default;
}

export type HorarioFormat = "html" | "pdf";

interface RenderSlot {
  diaSemana: number;
  ordem: number;
  disciplinaName: string;
  color: string | null;
  professor: string | null;
}
interface RenderData {
  turma: {
    code: string;
    unidadeName: string;
    year: number;
    config: { slots: { ordem: number; inicio: string; fim: string }[]; sabado: boolean };
  };
  slots: RenderSlot[];
  schoolName: string;
}

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

/** Cor de texto legível (preto/branco) conforme luminância do fundo. */
function textColor(hex: string | null): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return "#1a2b3c";
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1a2b3c" : "#ffffff";
}

export function buildHorarioHtml(data: RenderData): string {
  const { config } = data.turma;
  const numDias = config.sabado ? 6 : 5;
  const dias = DIAS.slice(0, numDias);

  // Linhas: usa config.slots; se vazio, deriva do maior ordem presente
  const maxOrdem = Math.max(1, ...data.slots.map((s) => s.ordem), ...config.slots.map((s) => s.ordem));
  const rows = config.slots.length > 0
    ? config.slots.slice().sort((a, b) => a.ordem - b.ordem)
    : Array.from({ length: maxOrdem }, (_, i) => ({ ordem: i + 1, inicio: "", fim: "" }));

  const slotMap = new Map<string, RenderSlot>();
  for (const s of data.slots) slotMap.set(`${s.diaSemana}-${s.ordem}`, s);

  const body = rows.map((row) => {
    const time = row.inicio && row.fim ? `${row.inicio} - ${row.fim}` : "";
    const cells = dias.map((_, idx) => {
      const dia = idx + 1;
      const cell = slotMap.get(`${dia}-${row.ordem}`);
      if (!cell) return `<td class="empty"></td>`;
      const bg = cell.color && /^#[0-9a-fA-F]{6}$/.test(cell.color) ? cell.color : "#e8eef6";
      const fg = textColor(cell.color);
      return `<td style="background:${bg};color:${fg}">
        ${time ? `<div class="time">${time}</div>` : ""}
        <div class="disc">${esc(cell.disciplinaName)}</div>
        ${cell.professor ? `<div class="prof">${esc(cell.professor)}</div>` : ""}
      </td>`;
    }).join("");
    return `<tr><td class="ord">${row.ordem}ª${time ? `<br><span>${time}</span>` : ""}</td>${cells}</tr>`;
  }).join("");

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; padding: 18px; color: #1a2b3c; }
    .head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
    .head h1 { font-size: 16px; color: #1a3557; }
    .head .meta { font-size: 11px; color: #5a6a7e; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th { background: #1a3557; color: #fff; font-size: 11px; padding: 6px 4px; border: 1px solid #1a3557; }
    td { border: 1px solid #c9d4e3; padding: 5px 4px; vertical-align: middle; text-align: center; height: 52px; }
    td.ord { width: 60px; background: #eef2f8; font-size: 10px; font-weight: bold; color: #5a6a7e; }
    td.ord span { font-weight: 400; }
    td.empty { background: #fafbfd; }
    .time { font-size: 9px; opacity: .85; }
    .disc { font-size: 12px; font-weight: bold; line-height: 1.15; }
    .prof { font-size: 9px; opacity: .9; margin-top: 1px; }
  </style></head><body>
    <div class="head">
      <h1>${esc(data.schoolName)} — Grade de Horários</h1>
      <div class="meta">Turma <strong>${esc(data.turma.code)}</strong> · ${esc(data.turma.unidadeName)} · ${data.turma.year}</div>
    </div>
    <table>
      <thead><tr><th class="ord">Aula</th>${dias.map((d) => `<th>${d}</th>`).join("")}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </body></html>`;
}

export async function renderHorario(html: string, format: HorarioFormat): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  if (format === "html") {
    return { buffer: Buffer.from(html, "utf-8"), contentType: "text/html; charset=utf-8", ext: "html" };
  }
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
    const pdf = await page.pdf({ format: "A4", landscape: true, printBackground: true, margin: { top: "8mm", bottom: "8mm", left: "8mm", right: "8mm" } });
    return { buffer: Buffer.from(pdf), contentType: "application/pdf", ext: "pdf" };
  } finally {
    await browser.close();
  }
}
