import { NextResponse } from "next/server";
import { prisma } from "@nexora/db";
import { createAuditLog } from "@nexora/db/src/queries/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Cron chamado a cada minuto (ou a cada 5 min) pelo agendador externo (Railway, Vercel, etc.)
// Verifica sessões SCHEDULED que começam nos próximos 15 min e registra lembretes.

const REMINDER_WINDOW_MS = 15 * 60 * 1000; // 15 min

export async function POST(req: Request) {
  // Validação simples de segurança — segredo compartilhado no header
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  // Sessões que começam nos próximos 15 min e ainda não foram iniciadas
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

    for (const enrollment of course.enrollments) {
      // Evitar lembretes duplicados: verificar se já existe AuditLog para este par
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
        // TODO(fase-2-digisac): chamar sendWhatsApp quando disponível
      });

      reminded++;
    }
  }

  return NextResponse.json({ sessions: sessions.length, reminded });
}
