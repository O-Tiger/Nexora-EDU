import { NextResponse } from "next/server";
import { prisma } from "@nexora/db";
import { createAuditLog } from "@nexora/db/src/queries/audit";
import { sendWhatsAppEvent } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REMINDER_WINDOW_MS = 15 * 60 * 1000; // 15 min

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const sessions = await prisma.liveSession.findMany({
    where: {
      status: "SCHEDULED",
      startAt: { gte: now, lte: windowEnd },
    },
    include: {
      lesson: {
        include: {
          module: {
            include: {
              course: {
                include: {
                  enrollments: {
                    where: { status: "ACTIVE" },
                    select: { userId: true, tenantId: true, id: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  let reminded = 0;

  for (const session of sessions) {
    const course = session.lesson.module.course;
    const tenantId = course.tenantId;

    // Fetch phones once for all enrolled users of this session
    const userIds = course.enrollments.map((e) => e.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, phone: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    for (const enrollment of course.enrollments) {
      const already = await prisma.auditLog.findFirst({
        where: {
          tenantId,
          userId: enrollment.userId,
          action: "live.reminder",
          resource: `liveSession:${session.id}`,
        },
      });
      if (already) continue;

      await createAuditLog(tenantId, enrollment.userId, "live.reminder", `liveSession:${session.id}`, {
        lessonTitle: session.lesson.title,
        startAt: session.startAt.toISOString(),
      });

      const user = userMap.get(enrollment.userId);
      if (user?.phone) {
        void sendWhatsAppEvent(tenantId, "live.reminder", user.phone, {
          name: user.name,
          lesson: session.lesson.title,
          date: session.startAt.toLocaleDateString("pt-BR"),
          time: session.startAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        });
      }

      reminded++;
    }
  }

  return NextResponse.json({ sessions: sessions.length, reminded });
}
