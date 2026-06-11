import { prisma } from "../client";
import type { AnoLetivoStatus, Etapa, TurmaEnrollmentStatus } from "@prisma/client";

// ─── Unidades ─────────────────────────────────────────────────────────────────

export async function getUnidades(tenantId: string, onlyActive = true) {
  return prisma.unidade.findMany({
    where: { tenantId, ...(onlyActive && { active: true }) },
    orderBy: { name: "asc" },
  });
}

export async function createUnidade(data: {
  tenantId: string;
  name: string;
  code: string;
  gender: "MASCULINO" | "FEMININO" | "MISTO";
}) {
  return prisma.unidade.create({ data });
}

export async function updateUnidade(id: string, tenantId: string, data: Partial<{
  name: string; code: string; gender: "MASCULINO" | "FEMININO" | "MISTO"; active: boolean;
}>) {
  return prisma.unidade.updateMany({ where: { id, tenantId }, data });
}

// ─── Anos letivos ─────────────────────────────────────────────────────────────

export async function getAnosLetivos(tenantId: string) {
  return prisma.anoLetivo.findMany({
    where: { tenantId },
    orderBy: { year: "desc" },
    include: { _count: { select: { turmas: true } } },
  });
}

export async function getAnoLetivoAtivo(tenantId: string) {
  return prisma.anoLetivo.findFirst({
    where: { tenantId, status: "EM_ANDAMENTO" },
  });
}

export async function createAnoLetivo(data: {
  tenantId: string;
  year: number;
  startDate: Date;
  endDate: Date;
}) {
  return prisma.anoLetivo.create({ data });
}

export async function updateAnoLetivoStatus(id: string, tenantId: string, status: AnoLetivoStatus) {
  return prisma.anoLetivo.updateMany({ where: { id, tenantId }, data: { status } });
}

// ─── Turmas ───────────────────────────────────────────────────────────────────

export async function getTurmasByAnoLetivo(tenantId: string, anoLetivoId: string) {
  return prisma.turma.findMany({
    where: { tenantId, anoLetivoId },
    include: {
      unidade: { select: { id: true, name: true, code: true, gender: true } },
      _count: { select: { enrollments: { where: { status: "ATIVA" } } } },
    },
    orderBy: [{ unidade: { name: "asc" } }, { etapa: "asc" }, { ano: "asc" }, { letra: "asc" }],
  });
}

export async function getTurmasByUnidade(tenantId: string, unidadeId: string, anoLetivoId: string) {
  return prisma.turma.findMany({
    where: { tenantId, unidadeId, anoLetivoId },
    include: { _count: { select: { enrollments: { where: { status: "ATIVA" } } } } },
    orderBy: [{ etapa: "asc" }, { ano: "asc" }, { letra: "asc" }],
  });
}

export async function getTurmaById(tenantId: string, id: string) {
  return prisma.turma.findFirst({
    where: { id, tenantId },
    include: {
      unidade: true,
      anoLetivo: true,
      enrollments: {
        where: { status: "ATIVA" },
        include: {
          student: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
        orderBy: { student: { name: "asc" } },
      },
    },
  });
}

export async function createTurma(data: {
  tenantId: string;
  unidadeId: string;
  anoLetivoId: string;
  code: string;
  etapa: Etapa;
  ano: number;
  letra: string;
  periodo: "MANHA" | "TARDE" | "NOITE" | "INTEGRAL";
  maxStudents: number;
}) {
  return prisma.turma.create({ data });
}

export async function deleteTurma(id: string, tenantId: string) {
  // Only allow deletion if no active enrollments
  const count = await prisma.turmaEnrollment.count({
    where: { turmaId: id, status: "ATIVA" },
  });
  if (count > 0) throw new Error("Não é possível excluir turma com alunos matriculados.");
  return prisma.turma.deleteMany({ where: { id, tenantId } });
}

// ─── Matrículas K-12 ──────────────────────────────────────────────────────────

export async function enrollStudentInTurma(data: {
  tenantId: string;
  studentId: string;
  turmaId: string;
  anoLetivoId: string;
  notes?: string;
}) {
  return prisma.turmaEnrollment.create({ data });
}

export async function updateTurmaEnrollmentStatus(
  id: string,
  tenantId: string,
  status: TurmaEnrollmentStatus,
) {
  return prisma.turmaEnrollment.updateMany({
    where: { id, tenantId },
    data: { status, ...(status === "CANCELADA" && { cancelledAt: new Date() }) },
  });
}

export async function getStudentTurmaHistory(tenantId: string, studentId: string) {
  return prisma.turmaEnrollment.findMany({
    where: { tenantId, studentId },
    include: {
      turma: {
        include: {
          unidade: { select: { name: true, code: true } },
          anoLetivo: { select: { year: true } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });
}

// ─── Responsáveis ─────────────────────────────────────────────────────────────

export async function getGuardiansByStudent(tenantId: string, studentId: string) {
  return prisma.guardian.findMany({
    where: { tenantId, studentId },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
  });
}

export async function createGuardian(data: {
  tenantId: string;
  studentId: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  relationship: "PAI" | "MAE" | "RESPONSAVEL" | "OUTRO";
  isPrimary: boolean;
  userId?: string;
}) {
  // If setting as primary, clear existing primary first
  if (data.isPrimary) {
    await prisma.guardian.updateMany({
      where: { tenantId: data.tenantId, studentId: data.studentId, isPrimary: true },
      data: { isPrimary: false },
    });
  }
  return prisma.guardian.create({ data });
}

export async function deleteGuardian(id: string, tenantId: string) {
  return prisma.guardian.deleteMany({ where: { id, tenantId } });
}

// ─── Overview stats ───────────────────────────────────────────────────────────

export async function getSecretariaOverview(tenantId: string, anoLetivoId: string) {
  const [turmas, enrollments, unidades] = await Promise.all([
    prisma.turma.count({ where: { tenantId, anoLetivoId } }),
    prisma.turmaEnrollment.count({ where: { tenantId, anoLetivoId, status: "ATIVA" } }),
    prisma.unidade.count({ where: { tenantId, active: true } }),
  ]);
  return { turmas, enrollments, unidades };
}
