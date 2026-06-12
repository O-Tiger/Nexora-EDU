import { prisma } from "../client";

/** Professores ativos do tenant (para dropdowns de atribuição). */
export async function getProfessoresDisponiveis(tenantId: string) {
  return prisma.professor.findMany({
    where: { tenantId, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/** Professores do tenant com seus vínculos (turma + disciplina). */
export async function getProfessoresComVinculos(tenantId: string) {
  const professores = await prisma.professor.findMany({
    where: { tenantId, active: true },
    orderBy: { name: "asc" },
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
    vinculos: vinculos
      .filter((v) => v.professorId === p.id)
      .map((v) => ({ turmaCode: v.turma.code, disciplinaName: v.disciplina.name })),
  }));
}

export async function createProfessor(data: { tenantId: string; name: string; email?: string; phone?: string }) {
  return prisma.professor.create({ data });
}

/** Desativa o professor e remove seus vínculos com disciplinas. */
export async function deleteProfessor(id: string, tenantId: string) {
  return prisma.$transaction([
    prisma.turmaDisciplina.updateMany({ where: { tenantId, professorId: id }, data: { professorId: null } }),
    prisma.professor.updateMany({ where: { id, tenantId }, data: { active: false } }),
  ]);
}
