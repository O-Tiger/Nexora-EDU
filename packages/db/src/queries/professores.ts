import { prisma } from "../client";
import { getAnoLetivoAtivo } from "./secretaria";

/** Professores ativos do tenant (para dropdowns de atribuição). */
export async function getProfessoresDisponiveis(tenantId: string) {
  return prisma.professor.findMany({
    where: { tenantId, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/** Professores do tenant com seus vínculos (turma + disciplina) e usuário vinculado. */
export async function getProfessoresComVinculos(tenantId: string) {
  const professores = await prisma.professor.findMany({
    where: { tenantId, active: true },
    orderBy: { name: "asc" },
    include: { linkedUser: { select: { id: true, name: true, email: true } } },
  });

  const ids = professores.map((p) => p.id);
  const vinculos = await prisma.turmaDisciplina.findMany({
    where: { tenantId, professorId: { in: ids } },
    include: {
      disciplina: { select: { name: true } },
      turma: { select: { code: true } },
    },
  });

  return professores.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    linkedUser: p.linkedUser ? { id: p.linkedUser.id, name: p.linkedUser.name, email: p.linkedUser.email } : null,
    vinculos: vinculos
      .filter((v) => v.professorId === p.id)
      .map((v) => ({ turmaCode: v.turma.code, disciplinaName: v.disciplina.name })),
  }));
}

export async function createProfessor(data: { tenantId: string; name: string; email?: string; phone?: string }) {
  return prisma.professor.create({ data });
}

/** Desativa o professor e remove seus vínculos com disciplinas. */
/** Busca o registro de Professor vinculado ao userId (para portal /prof). */
export async function getProfessorByUserId(userId: string, tenantId: string) {
  return prisma.professor.findFirst({ where: { userId, tenantId, active: true } });
}

/** Turmas do ano ativo em que o professor leciona, com disciplinas e contagem de alunos. */
export async function getMinhasTurmas(professorId: string, tenantId: string) {
  const anoAtivo = await getAnoLetivoAtivo(tenantId);
  if (!anoAtivo) return [];

  const vinculos = await prisma.turmaDisciplina.findMany({
    where: { tenantId, professorId },
    include: {
      turma: {
        include: {
          anoLetivo: { select: { year: true } },
          unidade: { select: { name: true } },
          _count: { select: { enrollments: { where: { status: "ATIVA" } } } },
        },
      },
      disciplina: { select: { id: true, name: true, color: true } },
    },
  });

  // Keep only vinculos from the active year
  const filtered = vinculos.filter((v) => v.turma.anoLetivoId === anoAtivo.id);

  // Group by turma
  const byTurma = new Map<string, {
    turma: { id: string; code: string; unidadeName: string; year: number; alunosAtivos: number };
    disciplinas: { id: string; name: string; color: string | null }[];
  }>();

  for (const v of filtered) {
    const existing = byTurma.get(v.turmaId);
    if (existing) {
      existing.disciplinas.push(v.disciplina);
    } else {
      byTurma.set(v.turmaId, {
        turma: {
          id: v.turma.id,
          code: v.turma.code,
          unidadeName: v.turma.unidade.name,
          year: v.turma.anoLetivo.year,
          alunosAtivos: v.turma._count.enrollments,
        },
        disciplinas: [v.disciplina],
      });
    }
  }

  return Array.from(byTurma.values());
}

/** Horário semanal do professor (todos os seus vínculos nos horários do ano ativo). */
export async function getMeuHorario(professorId: string, tenantId: string) {
  const anoAtivo = await getAnoLetivoAtivo(tenantId);
  if (!anoAtivo) return [];

  const vinculos = await prisma.turmaDisciplina.findMany({
    where: { tenantId, professorId },
    select: { turmaId: true, disciplinaId: true, turma: { select: { anoLetivoId: true, code: true } } },
  });

  const activeVinculos = vinculos.filter((v) => v.turma.anoLetivoId === anoAtivo.id);
  if (activeVinculos.length === 0) return [];

  const turmaIds = [...new Set(activeVinculos.map((v) => v.turmaId))];
  const discIds = [...new Set(activeVinculos.map((v) => v.disciplinaId))];

  const horarios = await prisma.horarioAula.findMany({
    where: {
      tenantId,
      turmaId: { in: turmaIds },
      disciplinaId: { in: discIds },
    },
    include: {
      turma: { select: { code: true, horarioConfig: true } },
      disciplina: { select: { name: true, color: true } },
    },
    orderBy: [{ diaSemana: "asc" }, { ordem: "asc" }],
  });

  // Only keep slots where turma+disciplina matches one of the professor's vinculos
  const vinculoSet = new Set(activeVinculos.map((v) => `${v.turmaId}::${v.disciplinaId}`));
  return horarios.filter((h) => vinculoSet.has(`${h.turmaId}::${h.disciplinaId}`));
}

export async function deleteProfessor(id: string, tenantId: string) {
  return prisma.$transaction([
    prisma.turmaDisciplina.updateMany({ where: { tenantId, professorId: id }, data: { professorId: null } }),
    prisma.professor.updateMany({ where: { id, tenantId }, data: { active: false } }),
  ]);
}

/** Users com role PROFESSOR neste tenant (candidatos para vincular ao cadastro interno). */
export async function getUsersWithProfessorRole(tenantId: string) {
  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId, role: "PROFESSOR", active: true },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return memberships.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email }));
}

export async function linkUserToProfessor(professorId: string, userId: string, tenantId: string) {
  return prisma.professor.updateMany({ where: { id: professorId, tenantId }, data: { userId } });
}

export async function unlinkUserFromProfessor(professorId: string, tenantId: string) {
  return prisma.professor.updateMany({ where: { id: professorId, tenantId }, data: { userId: null } });
}
