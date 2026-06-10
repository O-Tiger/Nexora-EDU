import { prisma } from "../client";

export async function getLiveSessionByLesson(tenantId: string, lessonId: string) {
  return prisma.liveSession.findFirst({
    where: { tenantId, lessonId },
    include: { _count: { select: { attendances: true } } },
  });
}

export async function getLiveSessionById(tenantId: string, id: string) {
  return prisma.liveSession.findFirst({
    where: { id, tenantId },
    include: {
      lesson: { select: { id: true, title: true, moduleId: true } },
      attendances: { select: { enrollmentId: true, joinedAt: true, leftAt: true } },
    },
  });
}

/** Sessões agendadas ou ao vivo do tenant, ordenadas por startAt. */
export async function getUpcomingLiveSessions(tenantId: string) {
  return prisma.liveSession.findMany({
    where: { tenantId, status: { in: ["SCHEDULED", "LIVE"] } },
    include: { lesson: { select: { title: true, module: { select: { course: { select: { title: true } } } } } } },
    orderBy: { startAt: "asc" },
  });
}

export async function createLiveSession(
  tenantId: string,
  data: {
    lessonId: string;
    meetingUrl: string;
    startAt: Date;
    durationMin?: number | undefined;
  },
) {
  return prisma.liveSession.create({
    data: {
      tenantId,
      lessonId: data.lessonId,
      meetingUrl: data.meetingUrl,
      startAt: data.startAt,
      ...(data.durationMin !== undefined && { durationMin: data.durationMin }),
    },
  });
}

export async function updateLiveSession(
  tenantId: string,
  id: string,
  data: {
    meetingUrl?: string | undefined;
    startAt?: Date | undefined;
    durationMin?: number | undefined;
    status?: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED" | undefined;
    recordingUrl?: string | null | undefined;
  },
) {
  return prisma.liveSession.update({
    where: { id, tenantId },
    data: {
      ...(data.meetingUrl !== undefined && { meetingUrl: data.meetingUrl }),
      ...(data.startAt !== undefined && { startAt: data.startAt }),
      ...(data.durationMin !== undefined && { durationMin: data.durationMin }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.recordingUrl !== undefined && { recordingUrl: data.recordingUrl }),
    },
  });
}

/** Registra ou atualiza presença. Retorna true se é nova entrada. */
export async function recordAttendance(
  liveSessionId: string,
  enrollmentId: string,
  action: "join" | "leave",
): Promise<boolean> {
  if (action === "join") {
    const existing = await prisma.liveAttendance.findUnique({
      where: { liveSessionId_enrollmentId: { liveSessionId, enrollmentId } },
    });
    if (existing) return false;
    await prisma.liveAttendance.create({
      data: { liveSessionId, enrollmentId },
    });
    return true;
  }
  // leave: marca leftAt
  await prisma.liveAttendance.updateMany({
    where: { liveSessionId, enrollmentId, leftAt: null },
    data: { leftAt: new Date() },
  });
  return false;
}

/** Marca a aula ao vivo como concluída no progresso do aluno. */
export async function completeLiveLesson(enrollmentId: string, lessonId: string) {
  return prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    create: { enrollmentId, lessonId, completed: true, completedAt: new Date() },
    update: { completed: true, completedAt: new Date() },
  });
}
