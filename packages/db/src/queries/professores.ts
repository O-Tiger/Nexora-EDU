import { prisma } from "../client";

/** Usuários com papel PROFESSOR no tenant (para dropdowns de atribuição). */
export async function getProfessoresDisponiveis(tenantId: string) {
  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId, role: "PROFESSOR", active: true, user: { anonymizedAt: null } },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return memberships.map((m) => ({ id: m.user.id, name: m.user.name }));
}

/** Professores do tenant com seus vínculos (turma + disciplina). */
export async function getProfessoresComVinculos(tenantId: string) {
  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId, role: "PROFESSOR", active: true, user: { anonymizedAt: null } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const userIds = memberships.map((m) => m.user.id);
  const vinculos = await prisma.turmaDisciplina.findMany({
    where: { tenantId, professorId: { in: userIds } },
    include: {
      disciplina: { select: { name: true } },
      turma: { select: { code: true } },
    },
  });

  return memberships.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    vinculos: vinculos
      .filter((v) => v.professorId === m.user.id)
      .map((v) => ({ turmaCode: v.turma.code, disciplinaName: v.disciplina.name })),
  }));
}
