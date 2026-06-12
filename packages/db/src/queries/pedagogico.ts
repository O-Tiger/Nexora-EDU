import { prisma } from "../client";
import type { GradeKind } from "@prisma/client";
import { getFaltasFromDiario } from "./diario";

// ─── Disciplinas ───────────────────────────────────────────────────────────────

/** Disciplinas raiz (com suas frentes aninhadas) do tenant. */
export async function getDisciplinas(tenantId: string) {
  return prisma.disciplina.findMany({
    where: { tenantId, parentId: null },
    include: { frentes: { orderBy: { position: "asc" } } },
    orderBy: { position: "asc" },
  });
}

export async function createDisciplina(data: {
  tenantId: string;
  name: string;
  parentId?: string;
  position?: number;
}) {
  return prisma.disciplina.create({
    data: {
      tenantId: data.tenantId,
      name: data.name,
      position: data.position ?? 0,
      ...(data.parentId && { parentId: data.parentId }),
    },
  });
}

export async function deleteDisciplina(id: string, tenantId: string) {
  return prisma.disciplina.deleteMany({ where: { id, tenantId } });
}

export async function updateDisciplinaColor(id: string, tenantId: string, color: string | null) {
  return prisma.disciplina.updateMany({ where: { id, tenantId }, data: { color } });
}

// ─── Cores: matéria + variantes nas frentes ─────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0; const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Gera N variantes de um hex base, variando a luminosidade em torno dela. */
export function colorVariants(base: string, n: number): string[] {
  if (!/^#[0-9a-fA-F]{6}$/.test(base) || n <= 0) return Array(Math.max(0, n)).fill(base);
  if (n === 1) return [base];
  const [h, s, l] = hexToHsl(base);
  const step = Math.min(0.12, 0.5 / (n - 1));
  return Array.from({ length: n }, (_, i) => {
    const delta = (i - (n - 1) / 2) * step;
    const nl = Math.max(0.22, Math.min(0.82, l + delta));
    return hslToHex(h, s, nl);
  });
}

/**
 * Define a cor base da matéria e aplica variantes (tons) a cada frente.
 * Retorna o mapa id→cor para a UI atualizar sem recarregar.
 */
export async function setMateriaColors(
  tenantId: string,
  parentId: string,
  baseColor: string,
): Promise<Record<string, string>> {
  const frentes = await prisma.disciplina.findMany({
    where: { tenantId, parentId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  const vars = colorVariants(baseColor, frentes.length);
  const colorById: Record<string, string> = { [parentId]: baseColor };
  const ops = [prisma.disciplina.updateMany({ where: { id: parentId, tenantId }, data: { color: baseColor } })];
  frentes.forEach((f, i) => {
    const c = vars[i] ?? baseColor;
    colorById[f.id] = c;
    ops.push(prisma.disciplina.updateMany({ where: { id: f.id, tenantId }, data: { color: c } }));
  });
  await prisma.$transaction(ops);
  return colorById;
}

// ─── Vínculo turma ↔ disciplina ──────────────────────────────────────────────

export async function getTurmaDisciplinas(tenantId: string, turmaId: string) {
  const links = await prisma.turmaDisciplina.findMany({
    where: { tenantId, turmaId },
    include: { disciplina: true },
  });
  return links.map((l) => l.disciplina);
}

/** Disciplinas da turma com professor vinculado (para grade e atribuição). */
export async function getTurmaDisciplinasComProfessor(tenantId: string, turmaId: string) {
  return prisma.turmaDisciplina.findMany({
    where: { tenantId, turmaId },
    include: {
      disciplina: { select: { id: true, name: true, color: true } },
      professor: { select: { id: true, name: true } },
    },
    orderBy: { disciplina: { name: "asc" } },
  });
}

/** Atualiza disciplinas da turma sem destruir vínculos de professor existentes. */
export async function setTurmaDisciplinas(tenantId: string, turmaId: string, disciplinaIds: string[]) {
  const existing = await prisma.turmaDisciplina.findMany({
    where: { tenantId, turmaId },
    select: { disciplinaId: true },
  });
  const existingIds = new Set(existing.map((e) => e.disciplinaId));
  const selected = new Set(disciplinaIds);

  const toAdd = disciplinaIds.filter((id) => !existingIds.has(id));
  const toRemove = [...existingIds].filter((id) => !selected.has(id));

  await prisma.$transaction([
    prisma.turmaDisciplina.deleteMany({ where: { tenantId, turmaId, disciplinaId: { in: toRemove } } }),
    prisma.turmaDisciplina.createMany({
      data: toAdd.map((disciplinaId) => ({ tenantId, turmaId, disciplinaId })),
      skipDuplicates: true,
    }),
  ]);
}

export async function setTurmaDisciplinaProfessor(
  tenantId: string,
  turmaId: string,
  disciplinaId: string,
  professorId: string | null,
) {
  return prisma.turmaDisciplina.updateMany({
    where: { tenantId, turmaId, disciplinaId },
    data: { professorId },
  });
}

// ─── Notas e frequência ──────────────────────────────────────────────────────

export async function upsertGrade(data: {
  tenantId: string;
  enrollmentId: string;
  disciplinaId: string;
  period: number;
  kind: GradeKind;
  score: number | null;
  updatedBy: string;
}) {
  return prisma.grade.upsert({
    where: {
      enrollmentId_disciplinaId_period_kind: {
        enrollmentId: data.enrollmentId,
        disciplinaId: data.disciplinaId,
        period: data.period,
        kind: data.kind,
      },
    },
    create: data,
    update: { score: data.score, updatedBy: data.updatedBy },
  });
}

export async function upsertAttendance(data: {
  tenantId: string;
  enrollmentId: string;
  disciplinaId: string;
  absences: number;
}) {
  return prisma.attendance.upsert({
    where: {
      enrollmentId_disciplinaId: { enrollmentId: data.enrollmentId, disciplinaId: data.disciplinaId },
    },
    create: data,
    update: { absences: data.absences },
  });
}

// ─── Dados de boletim ────────────────────────────────────────────────────────

export type BoletimDisciplinaRow = {
  disciplinaId: string;
  name: string;
  isFrente: boolean;
  parentId: string | null;
  grades: Record<string, number | null>; // chave "p{period}-{kind}"
  absences: number;
};

export type BoletimStudent = {
  enrollmentId: string;
  studentName: string;
  studentNumber: number;
  rows: BoletimDisciplinaRow[];
  totalAbsences: number;
};

export type BoletimData = {
  turma: {
    id: string;
    code: string;
    period: string;
    unidadeName: string;
    year: number;
  };
  disciplinaOrder: { id: string; name: string; isFrente: boolean; parentId: string | null }[];
  students: BoletimStudent[];
};

/**
 * Monta os dados completos do boletim de uma turma (todos os alunos ativos)
 * ou de um único aluno (enrollmentId).
 */
export async function getBoletimData(
  tenantId: string,
  turmaId: string,
  onlyEnrollmentId?: string,
): Promise<BoletimData | null> {
  const turma = await prisma.turma.findFirst({
    where: { id: turmaId, tenantId },
    include: {
      unidade: { select: { name: true } },
      anoLetivo: { select: { year: true } },
      disciplinas: {
        include: { disciplina: { include: { parent: true } } },
      },
      enrollments: {
        where: {
          status: "ATIVA",
          ...(onlyEnrollmentId && { id: onlyEnrollmentId }),
        },
        include: { student: { select: { name: true } } },
        orderBy: { student: { name: "asc" } },
      },
    },
  });
  if (!turma) return null;

  // Ordem das disciplinas: raiz por position, frentes logo após o pai
  const disciplinas = turma.disciplinas.map((td) => td.disciplina);
  const roots = disciplinas.filter((d) => !d.parentId).sort((a, b) => a.position - b.position);
  const frentesByParent = new Map<string, typeof disciplinas>();
  for (const d of disciplinas) {
    if (d.parentId) {
      const arr = frentesByParent.get(d.parentId) ?? [];
      arr.push(d);
      frentesByParent.set(d.parentId, arr);
    }
  }
  const orderedDisciplinas: { id: string; name: string; isFrente: boolean; parentId: string | null }[] = [];
  for (const root of roots) {
    orderedDisciplinas.push({ id: root.id, name: root.name, isFrente: false, parentId: null });
    const fr = (frentesByParent.get(root.id) ?? []).sort((a, b) => a.position - b.position);
    for (const f of fr) orderedDisciplinas.push({ id: f.id, name: f.name, isFrente: true, parentId: root.id });
  }
  // Frentes órfãs (pai não vinculado à turma) — incluir mesmo assim
  for (const d of disciplinas) {
    if (d.parentId && !roots.find((r) => r.id === d.parentId) && !orderedDisciplinas.find((o) => o.id === d.id)) {
      orderedDisciplinas.push({ id: d.id, name: d.name, isFrente: true, parentId: d.parentId });
    }
  }

  const enrollmentIds = turma.enrollments.map((e) => e.id);
  const [grades, attendances, faltasDiario, diarioCount] = await Promise.all([
    prisma.grade.findMany({ where: { tenantId, enrollmentId: { in: enrollmentIds } } }),
    prisma.attendance.findMany({ where: { tenantId, enrollmentId: { in: enrollmentIds } } }),
    getFaltasFromDiario(tenantId, turmaId),
    prisma.registroAula.count({ where: { tenantId, turmaId } }),
  ]);
  // Se a turma tem diário lançado, as faltas vêm dele (default 0); senão, do manual
  const diarioAtivo = diarioCount > 0;

  const students: BoletimStudent[] = turma.enrollments.map((enr, idx) => {
    const rows: BoletimDisciplinaRow[] = orderedDisciplinas.map((d) => {
      const cellGrades: Record<string, number | null> = {};
      for (const g of grades) {
        if (g.enrollmentId === enr.id && g.disciplinaId === d.id) {
          cellGrades[`p${g.period}-${g.kind}`] = g.score ?? null;
        }
      }
      // Faltas: diário ativo → conta do diário (default 0); senão, falta manual
      const att = attendances.find((a) => a.enrollmentId === enr.id && a.disciplinaId === d.id);
      const absences = diarioAtivo
        ? (faltasDiario.get(`${enr.id}|${d.id}`) ?? 0)
        : (att?.absences ?? 0);
      return {
        disciplinaId: d.id,
        name: d.name,
        isFrente: d.isFrente,
        parentId: d.parentId,
        grades: cellGrades,
        absences,
      };
    });
    const totalAbsences = rows.reduce((sum, r) => sum + r.absences, 0);
    return {
      enrollmentId: enr.id,
      studentName: enr.student.name,
      studentNumber: idx + 1,
      rows,
      totalAbsences,
    };
  });

  const periodLabels: Record<string, string> = {
    MANHA: "Matutino", TARDE: "Vespertino", NOITE: "Noturno", INTEGRAL: "Integral",
  };

  return {
    turma: {
      id: turma.id,
      code: turma.code,
      period: periodLabels[turma.periodo] ?? turma.periodo,
      unidadeName: turma.unidade.name,
      year: turma.anoLetivo.year,
    },
    disciplinaOrder: orderedDisciplinas,
    students,
  };
}
