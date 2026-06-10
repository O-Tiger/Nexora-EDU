"use server";

import { auth } from "@nexora/auth";
import { prisma } from "@nexora/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createLiveSession,
  updateLiveSession,
  recordAttendance,
  completeLiveLesson,
} from "@nexora/db/src/queries/live-sessions";
import { createAuditLog } from "@nexora/db/src/queries/audit";
import { CreateLiveSessionSchema, UpdateLiveSessionSchema } from "@nexora/validators";

async function requireStaff() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId, id } = session.user;
  if (!["ADMIN", "SUPER_ADMIN", "COORDENADOR", "PROFESSOR"].includes(role)) redirect("/unauthorized");
  return { tenantId: activeTenantId, userId: id };
}

async function requireSession() {
  const session = await auth();
  if (!session) redirect("/login");
  return { tenantId: session.user.activeTenantId, userId: session.user.id };
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export async function createLiveSessionAction(courseId: string, data: unknown) {
  const { tenantId, userId } = await requireStaff();
  const parsed = CreateLiveSessionSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  // Verificar que a aula pertence ao tenant e é do tipo LIVE
  const lesson = await prisma.lesson.findFirst({
    where: { id: parsed.data.lessonId, type: "LIVE", module: { course: { tenantId } } },
    select: { id: true },
  });
  if (!lesson) return { error: "Aula não encontrada ou tipo incorreto" };

  // Uma aula LIVE tem no máximo uma sessão
  const existing = await prisma.liveSession.findUnique({ where: { lessonId: parsed.data.lessonId } });
  if (existing) return { error: "Esta aula já tem uma sessão agendada" };

  const session = await createLiveSession(tenantId, {
    lessonId: parsed.data.lessonId,
    meetingUrl: parsed.data.meetingUrl,
    startAt: parsed.data.startAt,
    durationMin: parsed.data.durationMin,
  });

  await createAuditLog(tenantId, userId, "live.create", `liveSession:${session.id}`, {
    lessonId: parsed.data.lessonId,
    startAt: parsed.data.startAt.toISOString(),
  });

  revalidatePath(`/admin/cursos/${courseId}`);
  return { sessionId: session.id };
}

export async function updateLiveSessionAction(courseId: string, id: string, data: unknown) {
  const { tenantId, userId } = await requireStaff();
  const parsed = UpdateLiveSessionSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  // Ownership: sessão deve pertencer ao tenant
  const existing = await prisma.liveSession.findFirst({ where: { id, tenantId } });
  if (!existing) return { error: "Sessão não encontrada" };

  await updateLiveSession(tenantId, id, {
    ...(parsed.data.meetingUrl !== undefined && { meetingUrl: parsed.data.meetingUrl }),
    ...(parsed.data.startAt !== undefined && { startAt: parsed.data.startAt }),
    ...(parsed.data.durationMin !== undefined && { durationMin: parsed.data.durationMin }),
    ...(parsed.data.status !== undefined && { status: parsed.data.status }),
    ...(parsed.data.recordingUrl !== undefined && { recordingUrl: parsed.data.recordingUrl }),
  });

  if (parsed.data.status === "LIVE") {
    await createAuditLog(tenantId, userId, "live.start", `liveSession:${id}`);
  } else if (parsed.data.status === "ENDED") {
    await createAuditLog(tenantId, userId, "live.end", `liveSession:${id}`, {
      recordingUrl: parsed.data.recordingUrl ?? null,
    });
  }

  revalidatePath(`/admin/cursos/${courseId}`);
  revalidatePath(`/aluno/cursos`);
  return { success: true };
}

/** Vincula gravação YouTube à sessão encerrada. */
export async function setRecordingAction(courseId: string, sessionId: string, recordingUrl: string) {
  const { tenantId, userId } = await requireStaff();
  const session = await prisma.liveSession.findFirst({ where: { id: sessionId, tenantId } });
  if (!session) return { error: "Sessão não encontrada" };

  await updateLiveSession(tenantId, sessionId, { recordingUrl });
  await createAuditLog(tenantId, userId, "live.recording", `liveSession:${sessionId}`, { recordingUrl });
  revalidatePath(`/admin/cursos/${courseId}`);
  revalidatePath(`/aluno/cursos`);
  return { success: true };
}

// ─── Aluno ────────────────────────────────────────────────────────────────────

/** Registra entrada/saída do aluno na sala. Marca aula concluída ao entrar. */
export async function attendLiveAction(liveSessionId: string, action: "join" | "leave") {
  const { tenantId, userId } = await requireSession();

  const liveSession = await prisma.liveSession.findFirst({
    where: { id: liveSessionId, tenantId, status: "LIVE" },
    select: { id: true, lessonId: true },
  });
  if (!liveSession) return { error: "Sessão não encontrada ou não está ao vivo" };

  // Matrícula ativa no curso da aula
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      course: { modules: { some: { lessons: { some: { id: liveSession.lessonId } } } } },
    },
    select: { id: true },
  });
  if (!enrollment) return { error: "Matrícula não encontrada" };

  const isNew = await recordAttendance(liveSessionId, enrollment.id, action);

  // Marca progresso ao entrar pela primeira vez
  if (action === "join" && isNew) {
    await completeLiveLesson(enrollment.id, liveSession.lessonId);
  }

  return { success: true };
}
