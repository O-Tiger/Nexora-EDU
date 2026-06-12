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

// ─── Vínculo turma ↔ disciplina ──────────────────────────────────────────────

export async function getTurmaDisciplinas(tenantId: string, turmaId: string) {
  const links = await prisma.turmaDisciplina.findMany({
    where: { tenantId, turmaId },
    include: { disciplina: true },
  });
  return links.map((l) => l.disciplina);
}

export async function setTurmaDisciplinas(tenantId: string, turmaId: string, disciplinaIds: string[]) {
  await prisma.$transaction([
    prisma.turmaDisciplina.deleteMany({ where: { tenantId, turmaId } }),
    prisma.turmaDisciplina.createMany({
      data: disciplinaIds.map((disciplinaId) => ({ tenantId, turmaId, disciplinaId })),
      skipDuplicates: true,
    }),
  ]);
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
