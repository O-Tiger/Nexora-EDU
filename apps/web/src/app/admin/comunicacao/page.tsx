import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@nexora/db";
import { getAnnouncements } from "@nexora/db/src/queries/announcements";
import { getMessageThreads } from "@nexora/db/src/queries/messages";
import { getKnowledgeEntries } from "@nexora/db/src/queries/knowledge";
import { Badge } from "@nexora/ui";
import { Megaphone, MessageSquare, BookOpen, Trash2, Pin } from "lucide-react";
import { AnnouncementForm } from "@/components/communication/announcement-form";
import { KnowledgeEditor } from "@/components/communication/knowledge-editor";
import { deleteAnnouncementAction } from "@/actions/communication";

export const metadata: Metadata = { title: "Comunicação" };

export default async function AdminCommunicationPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const tenantId = session.user.activeTenantId;
  const userId = session.user.id;

  const [announcements, threads, knowledgeEntries, courses] = await Promise.all([
    getAnnouncements(tenantId, { limit: 30 }),
    getMessageThreads(tenantId, userId),
    getKnowledgeEntries(tenantId),
    prisma.course.findMany({ where: { tenantId }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);

  const unreadCount = threads.filter((t) => t.receiverId === userId && t.readAt === null).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Comunicação</h1>
        <p className="text-sm text-navy-500">Avisos, mensagens e base de conhecimento do chatbot.</p>
      </div>

      {/* ─── Avisos ─────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-teal-600" />
          <h2 className="text-lg font-semibold text-navy-900">Avisos</h2>
        </div>

        <div className="rounded-lg border border-navy-100 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-navy-700">Novo aviso</p>
          <AnnouncementForm courses={courses} />
        </div>

        {announcements.length > 0 && (
          <div className="space-y-2">
            {announcements.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg border border-navy-100 bg-white p-3">
                {a.pinned && <Pin className="h-4 w-4 shrink-0 text-teal-500 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-navy-900 text-sm">{a.title}</p>
                    <Badge variant="secondary" className="text-xs">{a.scope === "PLATFORM" ? "Plataforma" : "Curso"}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-navy-500">{a.body}</p>
                  <p className="mt-1 text-xs text-navy-400">
                    {a.author.name} · {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <form action={deleteAnnouncementAction.bind(null, a.id)}>
                  <button type="submit" className="p-1 text-navy-300 hover:text-red-500" aria-label="Excluir aviso">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Mensagens ──────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-teal-600" />
          <h2 className="text-lg font-semibold text-navy-900">Mensagens</h2>
          {unreadCount > 0 && (
            <Badge className="text-xs">{unreadCount} não lida{unreadCount > 1 ? "s" : ""}</Badge>
          )}
        </div>

        {threads.length === 0 ? (
          <p className="text-sm text-navy-400">Nenhuma conversa ainda.</p>
        ) : (
          <div className="space-y-1">
            {threads.map((t) => {
              const other = t.senderId === userId ? t.receiver : t.sender;
              const unread = t.receiverId === userId && t.readAt === null;
              return (
                <Link
                  key={t.id}
                  href={`/admin/comunicacao/mensagens/${t.threadId}` as never}
                  className="flex items-center gap-3 rounded-lg border border-navy-100 bg-white p-3 transition hover:border-teal-300"
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${unread ? "font-semibold text-navy-900" : "font-medium text-navy-700"}`}>
                      {other.name}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-navy-400">{t.body}</p>
                  </div>
                  {unread && <div className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Base de conhecimento ───────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-teal-600" />
          <h2 className="text-lg font-semibold text-navy-900">Base de conhecimento do chatbot</h2>
        </div>
        <KnowledgeEditor initial={knowledgeEntries.map((e) => ({ id: e.id, question: e.question, answer: e.answer, active: e.active }))} />
      </section>
    </div>
  );
}
