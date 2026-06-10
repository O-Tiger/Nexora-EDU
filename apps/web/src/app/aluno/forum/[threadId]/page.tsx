import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { Button, Badge } from "@nexora/ui";
import { getThreadById } from "@nexora/db/src/queries/forum";
import { ForumThreadView } from "@/components/communication/forum-thread-view";

export default async function ForumThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  const { activeTenantId: tenantId, id: userId, role } = session.user;

  const thread = await getThreadById(tenantId, threadId);
  if (!thread) notFound();

  const isStaff = ["ADMIN", "SUPER_ADMIN", "COORDENADOR", "PROFESSOR"].includes(role);

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/aluno/cursos" as={"/aluno/cursos" as never}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-navy-900 text-xl">{thread.title}</h1>
          <p className="text-xs text-navy-400">{thread.author.name} · {new Date(thread.createdAt).toLocaleDateString("pt-BR")}</p>
        </div>
        {thread.locked && <Badge variant="secondary" className="flex items-center gap-1"><Lock className="h-3 w-3" />Bloqueado</Badge>}
      </div>

      <div className="rounded-lg border border-navy-100 bg-white p-4">
        <p className="text-navy-800 whitespace-pre-wrap">{thread.body}</p>
      </div>

      <ForumThreadView
        threadId={threadId}
        currentUserId={userId}
        isStaff={isStaff}
        locked={thread.locked}
        initialReplies={thread.replies.map((r) => ({
          id: r.id,
          body: r.body,
          authorId: r.authorId,
          createdAt: r.createdAt,
          author: r.author,
          replies: r.replies.map((rr) => ({
            id: rr.id,
            body: rr.body,
            authorId: rr.authorId,
            createdAt: rr.createdAt,
            author: rr.author,
            replies: [],
          })),
        }))}
      />
    </div>
  );
}
