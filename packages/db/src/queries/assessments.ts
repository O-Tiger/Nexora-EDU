import { prisma } from "../client";
import type { Prisma, AssessmentStatus, QuestionType } from "@prisma/client";

export async function getAssessments(tenantId: string, courseId: string) {
  return prisma.assessment.findMany({
    where: { tenantId, courseId },
    include: { _count: { select: { questions: true, submissions: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAssessmentById(tenantId: string, id: string) {
  return prisma.assessment.findFirst({
    where: { id, tenantId },
    include: { questions: { orderBy: { position: "asc" } } },
  });
}

/** Avaliação publicada visível ao aluno — sem expor o gabarito. */
export async function getAssessmentForStudent(tenantId: string, id: string) {
  return prisma.assessment.findFirst({
    where: { id, tenantId, status: "PUBLISHED" },
    include: {
      questions: {
        orderBy: { position: "asc" },
        select: { id: true, type: true, prompt: true, points: true, position: true, options: true },
      },
    },
  });
}

export async function createAssessment(
  tenantId: string,
  data: {
    courseId: string;
    moduleId?: string | undefined;
    title: string;
    description?: string | undefined;
    passingScore?: number | undefined;
    maxAttempts?: number | undefined;
    dueAt?: Date | undefined;
    formulaVar?: string | undefined;
    recoveryOfId?: string | undefined;
  },
) {
  return prisma.assessment.create({
    data: { tenantId, ...data } as Prisma.AssessmentUncheckedCreateInput,
  });
}

export async function updateAssessment(
  tenantId: string,
  id: string,
  data: {
    title?: string | undefined;
    description?: string | undefined;
    passingScore?: number | undefined;
    maxAttempts?: number | undefined;
    dueAt?: Date | null | undefined;
    formulaVar?: string | null | undefined;
    status?: AssessmentStatus | undefined;
  },
) {
  return prisma.assessment.update({
    where: { id, tenantId },
    data: data as Prisma.AssessmentUncheckedUpdateInput,
  });
}

export async function deleteAssessment(tenantId: string, id: string) {
  return prisma.assessment.delete({ where: { id, tenantId } });
}

/** Substitui todas as questões da avaliação numa transação (ownership validado). */
export async function setQuestions(
  tenantId: string,
  assessmentId: string,
  questions: {
    type: QuestionType;
    prompt: string;
    points: number;
    position: number;
    options?: Prisma.InputJsonValue;
    correctAnswer?: Prisma.InputJsonValue;
  }[],
) {
  const owns = await prisma.assessment.findFirst({ where: { id: assessmentId, tenantId } });
  if (!owns) throw new Error("Avaliação não encontrada ou sem permissão");

  await prisma.$transaction([
    prisma.question.deleteMany({ where: { assessmentId } }),
    ...questions.map((q, i) =>
      prisma.question.create({
        data: {
          assessmentId,
          type: q.type,
          prompt: q.prompt,
          points: q.points,
          position: i,
          ...(q.options !== undefined ? { options: q.options } : {}),
          ...(q.correctAnswer !== undefined ? { correctAnswer: q.correctAnswer } : {}),
        },
      }),
    ),
  ]);
}

/** Avaliações do curso que participam da fórmula de nota (têm formulaVar). */
export async function getGradeContext(tenantId: string, courseId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, tenantId },
    select: { id: true, gradeFormula: true },
  });
  const assessments = await prisma.assessment.findMany({
    where: { tenantId, courseId, formulaVar: { not: null } },
    select: { id: true, title: true, formulaVar: true },
    orderBy: { createdAt: "asc" },
  });
  return { course, assessments };
}

export async function setGradeFormula(tenantId: string, courseId: string, formula: string | null) {
  return prisma.course.update({
    where: { id: courseId, tenantId },
    data: { gradeFormula: formula },
  });
}
