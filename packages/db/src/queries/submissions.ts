import { prisma } from "../client";
import type { Prisma } from "@prisma/client";

export async function getSubmissions(tenantId: string, assessmentId: string) {
  return prisma.submission.findMany({
    where: { tenantId, assessmentId },
    orderBy: { submittedAt: "desc" },
  });
}

export async function getStudentSubmissions(enrollmentId: string, assessmentId: string) {
  return prisma.submission.findMany({
    where: { enrollmentId, assessmentId },
    orderBy: { attempt: "asc" },
  });
}

export async function countAttempts(enrollmentId: string, assessmentId: string) {
  return prisma.submission.count({ where: { enrollmentId, assessmentId } });
}

/**
 * Cria uma submissão já corrigida (auto) ou pendente de correção manual.
 * O número da tentativa é calculado a partir das tentativas existentes.
 */
export async function createSubmission(
  tenantId: string,
  data: {
    assessmentId: string;
    enrollmentId: string;
    answers: Prisma.InputJsonValue;
    fileKeys?: Prisma.InputJsonValue;
    score?: number | null;
    needsManualGrading: boolean;
  },
) {
  const attempt = (await countAttempts(data.enrollmentId, data.assessmentId)) + 1;
  return prisma.submission.create({
    data: {
      tenantId,
      assessmentId: data.assessmentId,
      enrollmentId: data.enrollmentId,
      attempt,
      answers: data.answers,
      ...(data.fileKeys !== undefined ? { fileKeys: data.fileKeys } : {}),
      status: data.needsManualGrading ? "SUBMITTED" : "GRADED",
      ...(data.score != null ? { score: data.score } : {}),
      ...(data.needsManualGrading ? {} : { gradedAt: new Date() }),
      submittedAt: new Date(),
    },
  });
}

export async function gradeSubmission(
  tenantId: string,
  id: string,
  data: { score: number; gradedBy: string },
) {
  return prisma.submission.update({
    where: { id, tenantId },
    data: { score: data.score, status: "GRADED", gradedAt: new Date(), gradedBy: data.gradedBy },
  });
}

export async function getSubmissionById(tenantId: string, id: string) {
  return prisma.submission.findFirst({
    where: { id, tenantId },
    include: { assessment: { include: { questions: { orderBy: { position: "asc" } } } } },
  });
}

/** Maior nota obtida pelo aluno em cada avaliação com formulaVar — para a fórmula final. */
export async function getScoresByVar(enrollmentId: string, courseId: string, tenantId: string) {
  const assessments = await prisma.assessment.findMany({
    where: { tenantId, courseId, formulaVar: { not: null } },
    select: { id: true, formulaVar: true },
  });
  const scope: Record<string, number> = {};
  for (const a of assessments) {
    if (!a.formulaVar) continue;
    const best = await prisma.submission.aggregate({
      where: { assessmentId: a.id, enrollmentId, status: "GRADED" },
      _max: { score: true },
    });
    scope[a.formulaVar] = best._max.score ?? 0;
  }
  return scope;
}
