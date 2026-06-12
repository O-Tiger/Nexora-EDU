import { auth } from "@nexora/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@nexora/ui";
import { getThread } from "@nexora/db/src/queries/messages";
import { MessageThread } from "@/components/communication/message-thread";

export default async function AdminMessageThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  const { activeTenantId: tenantId, id: userId } = session.user;

  const messages = await getThread(tenantId, threadId, userId);
  if (messages.length === 0) notFound();

  const other = messages[0]!.senderId === userId ? messages[0]!.receiver : messages[0]!.sender;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={"/admin/comunicacao" as never}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="font-semibold text-navy-900">{other.name}</h1>
      </div>
      <div className="flex-1 rounded-lg border border-navy-100 bg-white overflow-hidden">
        <MessageThread
          threadId={threadId}
          receiverId={other.id}
          currentUserId={userId}
          initialMessages={messages.map((m) => ({
            id: m.id,
            senderId: m.senderId,
            body: m.body,
            createdAt: m.createdAt,
            sender: m.sender,
          }))}
        />
      </div>
    </div>
  );
}
