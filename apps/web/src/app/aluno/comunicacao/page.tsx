import type { Metadata } from "next";
import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAnnouncements } from "@nexora/db/src/queries/announcements";
import { getMessageThreads, countUnread } from "@nexora/db/src/queries/messages";
import { Badge, EmptyState } from "@nexora/ui";
import { Megaphone, MessageSquare, ChevronRight, Pin } from "lucide-react";

export const metadata: Metadata = { title: "Comunicação" };

export default async function StudentCommunicationPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { activeTenantId: tenantId, id: userId } = session.user;

  const [announcements, threads, unreadCount] = await Promise.all([
    getAnnouncements(tenantId, { limit: 10 }),
    getMessageThreads(tenantId, userId),
    countUnread(tenantId, userId),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Comunicação</h1>
        <p className="text-sm text-navy-500">Avisos da instituição e suas mensagens.</p>
      </div>

      {/* ─── Avisos ──────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-teal-600" />
          <h2 className="text-lg font-semibold text-navy-900">Avisos recentes</h2>
        </div>

        {announcements.length === 0 ? (
          <EmptyState icon={<Megaphone className="h-6 w-6" />} title="Nenhum aviso ainda" description="Avisos da instituição aparecerão aqui." />
        ) : (
          <div className="space-y-2">
            {announcements.map((a) => (
              <div key={a.id} className={`rounded-lg border bg-white p-4 ${a.pinned ? "border-teal-200" : "border-navy-100"}`}>
                <div className="flex items-start gap-2">
                  {a.pinned && <Pin className="h-4 w-4 shrink-0 text-teal-500 mt-0.5" />}
                  <div>
                    <p className="font-medium text-navy-900">{a.title}</p>
                    <p className="mt-1 text-sm text-navy-600 whitespace-pre-wrap">{a.body}</p>
                    <p className="mt-2 text-xs text-navy-400">
                      {a.author.name} · {new Date(a.createdAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Mensagens ───────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-teal-600" />
          <h2 className="text-lg font-semibold text-navy-900">Mensagens</h2>
          {unreadCount > 0 && <Badge className="text-xs">{unreadCount} não lida{unreadCount > 1 ? "s" : ""}</Badge>}
        </div>

        {threads.length === 0 ? (
          <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="Nenhuma mensagem" description="Suas conversas com a secretaria aparecerão aqui." />
        ) : (
          <div className="space-y-1">
            {threads.map((t) => {
              const other = t.senderId === userId ? t.receiver : t.sender;
              const unread = t.receiverId === userId && t.readAt === null;
              return (
                <Link
                  key={t.id}
                  href={`/aluno/comunicacao/mensagens/${t.threadId}` as never}
                  className="flex items-center gap-3 rounded-lg border border-navy-100 bg-white p-3 transition hover:border-teal-300"
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${unread ? "font-semibold text-navy-900" : "text-navy-700"}`}>{other.name}</p>
                    <p className="mt-0.5 text-xs text-navy-400 line-clamp-1">{t.body}</p>
                  </div>
                  {unread && <div className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />}
                  <ChevronRight className="h-4 w-4 text-navy-300 shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
