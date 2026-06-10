import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@nexora/ui";
import { prisma } from "@nexora/db";
import { getLiveSessionByLesson } from "@nexora/db/src/queries/live-sessions";
import { LiveSessionManager } from "@/components/admin/live-session-manager";

export const metadata: Metadata = { title: "Gerenciar aula ao vivo" };

export default async function AdminLivePage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id: courseId, lessonId } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  const tenantId = session.user.activeTenantId;

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, type: "LIVE", module: { course: { id: courseId, tenantId } } },
    select: { id: true, title: true },
  });
  if (!lesson) notFound();

  const liveSession = await getLiveSessionByLesson(tenantId, lessonId);

  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/cursos/${courseId}` as never}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-navy-900">{lesson.title}</h1>
          <p className="text-xs text-navy-400">Aula ao vivo</p>
        </div>
      </div>

      <LiveSessionManager
        courseId={courseId}
        lessonId={lessonId}
        lessonTitle={lesson.title}
        session={liveSession
          ? {
              id: liveSession.id,
              meetingUrl: liveSession.meetingUrl,
              startAt: liveSession.startAt,
              durationMin: liveSession.durationMin,
              status: liveSession.status,
              recordingUrl: liveSession.recordingUrl,
              attendances: liveSession._count.attendances,
            }
          : null
        }
      />
    </div>
  );
}
