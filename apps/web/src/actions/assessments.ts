"use server";

import { auth } from "@nexora/auth";
import { prisma } from "@nexora/db";
import type { Prisma } from "@nexora/db";
import {
  createAssessment,
  updateAssessment,
  deleteAssessment,
  setQuestions,
  setGradeFormula,
} from "@nexora/db/src/queries/assessments";
import { createSubmission, gradeSubmission } from "@nexora/db/src/queries/submissions";
import { createAuditLog } from "@nexora/db/src/queries/audit";
import {
  CreateAssessmentSchema,
  UpdateAssessmentSchema,
  QuestionsSchema,
  SubmissionAnswersSchema,
} from "@nexora/validators";
import { validateFormula, evaluateFormula } from "@/lib/grade-formula";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireStaff() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId, id } = session.user;
  if (role !== "ADMINISTRATOR" && role !== "OWNER" && role !== "ASSISTANT" && role !== "PROFESSOR") {
    redirect("/unauthorized");
  }
  return { tenantId: activeTenantId, userId: id, role };
}

// ─── Autoria (staff) ────────────────────────────────────────────────────────

export async function createAssessmentAction(data: unknown) {
  const { tenantId } = await requireStaff();
  const parsed = CreateAssessmentSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  // Ownership do curso
  const course = await prisma.course.findFirst({
    where: { id: parsed.data.courseId, tenantId },
    select: { id: true },
  });
  if (!course) return { error: "Curso não encontrado" };

  const a = await createAssessment(tenantId, parsed.data);
  revalidatePath(`/admin/cursos/${parsed.data.courseId}/avaliacoes`);
  return { assessmentId: a.id };
}

export async function updateAssessmentAction(id: string, courseId: string, data: unknown) {
  const { tenantId } = await requireStaff();
  const parsed = UpdateAssessmentSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  await updateAssessment(tenantId, id, parsed.data);
  revalidatePath(`/admin/cursos/${courseId}/avaliacoes/${id}`);
  return { success: true };
}

export async function saveQuestionsAction(assessmentId: string, courseId: string, questions: unknown) {
  const { tenantId } = await requireStaff();
  const parsed = QuestionsSchema.safeParse(questions);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Questões inválidas" };

  await setQuestions(
    tenantId,
    assessmentId,
    parsed.data.map((q, i) => ({
      type: q.type,
      prompt: q.prompt,
      points: q.points,
      position: i,
      ...(q.options !== undefined ? { options: q.options as Prisma.InputJsonValue } : {}),
      ...(q.correctAnswer !== undefined ? { correctAnswer: q.correctAnswer as Prisma.InputJsonValue } : {}),
    })),
  );
  revalidatePath(`/admin/cursos/${courseId}/avaliacoes/${assessmentId}`);
  return { success: true };
}

export async function publishAssessmentAction(id: string, courseId: string) {
  const { tenantId } = await requireStaff();
  const assessment = await prisma.assessment.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { questions: true } } },
  });
  if (!assessment) return { error: "Avaliação não encontrada" };
  if (assessment._count.questions === 0) return { error: "Adicione ao menos uma questão antes de publicar" };

  await updateAssessment(tenantId, id, { status: "PUBLISHED" });
  revalidatePath(`/admin/cursos/${courseId}/avaliacoes`);
  return { success: true };
}

export async function deleteAssessmentAction(id: string, courseId: string) {
  const { tenantId } = await requireStaff();
  await deleteAssessment(tenantId, id);
  revalidatePath(`/admin/cursos/${courseId}/avaliacoes`);
}

// ─── Fórmula de nota ──────────────────────────────────────────────────────────

async function courseFormulaVars(tenantId: string, courseId: string): Promise<string[]> {
  const rows = await prisma.assessment.findMany({
    where: { tenantId, courseId, formulaVar: { not: null } },
    select: { formulaVar: true },
  });
  return rows.map((r) => r.formulaVar!).filter(Boolean);
}

export async function saveGradeFormulaAction(courseId: string, formula: string) {
  const { tenantId } = await requireStaff();
  const trimmed = formula.trim();

  if (trimmed) {
    const vars = await courseFormulaVars(tenantId, courseId);
    const check = validateFormula(trimmed, vars);
    if (!check.ok) return { error: check.error };
  }

  await setGradeFormula(tenantId, courseId, trimmed || null);
  revalidatePath(`/admin/cursos/${courseId}/avaliacoes`);
  return { success: true };
}

/** Preview da fórmula com valores de exemplo (sem persistir). */
export async function previewFormulaAction(courseId: string, formula: string) {
  const { tenantId } = await requireStaff();
  const vars = await courseFormulaVars(tenantId, courseId);
  const check = validateFormula(formula, vars);
  if (!check.ok) return { error: check.error };

  // Valores de exemplo: nota 8 em cada variável
  const scope: Record<string, number> = {};
  for (const v of vars) scope[v] = 8;
  try {
    const result = evaluateFormula(formula, scope);
    return { result, scope };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao avaliar" };
  }
}

// ─── Correção manual de dissertativas ─────────────────────────────────────────

export async function gradeSubmissionAction(submissionId: string, courseId: string, score: number) {
  const { tenantId, userId } = await requireStaff();
  if (!Number.isFinite(score) || score < 0) return { error: "Nota inválida" };

  await gradeSubmission(tenantId, submissionId, { score, gradedBy: userId });
  await createAuditLog(tenantId, userId, "submission.grade", `submission:${submissionId}`, { score });
  revalidatePath(`/admin/cursos/${courseId}/avaliacoes`);
  return { success: true };
}

// ─── Submissão do aluno (auto-correção) ───────────────────────────────────────

export async function submitAssessmentAction(assessmentId: string, rawAnswers: unknown, fileKeys?: string[]) {
  const session = await auth();
  if (!session) return { error: "Não autenticado" };
  const { activeTenantId: tenantId, id: userId } = session.user;

  const parsed = SubmissionAnswersSchema.safeParse(rawAnswers);
  if (!parsed.success) return { error: "Respostas inválidas" };

  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, tenantId, status: "PUBLISHED" },
    include: { questions: { orderBy: { position: "asc" } } },
  });
  if (!assessment) return { error: "Avaliação não encontrada" };

  // Matrícula ativa do aluno no curso da avaliação (anti-IDOR)
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, courseId: assessment.courseId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!enrollment) return { error: "Você não está matriculado neste curso" };

  // Limite de tentativas
  const used = await prisma.submission.count({
    where: { assessmentId, enrollmentId: enrollment.id },
  });
  if (used >= assessment.maxAttempts) return { error: "Limite de tentativas atingido" };

  // Auto-correção de MC/TF; dissertativas vão para correção manual
  let score = 0;
  let needsManual = false;
  for (const q of assessment.questions) {
    const ans = parsed.data[q.id];
    if (q.type === "ESSAY") {
      needsManual = true;
      continue;
    }
    if (q.type === "MULTIPLE_CHOICE" && typeof ans === "string" && ans === q.correctAnswer) {
      score += q.points;
    } else if (q.type === "TRUE_FALSE" && typeof ans === "boolean" && ans === q.correctAnswer) {
      score += q.points;
    }
  }

  const submission = await createSubmission(tenantId, {
    assessmentId,
    enrollmentId: enrollment.id,
    answers: parsed.data as Prisma.InputJsonValue,
    ...(fileKeys && fileKeys.length > 0 ? { fileKeys: fileKeys as Prisma.InputJsonValue } : {}),
    score,
    needsManualGrading: needsManual,
  });

  await createAuditLog(tenantId, userId, "assessment.submit", `assessment:${assessmentId}`, {
    submissionId: submission.id,
    autoScore: score,
    needsManual,
  });

  revalidatePath(`/aluno/cursos`);
  return {
    success: true,
    needsManual,
    score: needsManual ? null : score,
    submissionId: submission.id,
  };
}
