"use client";

import { useState, useTransition } from "react";
import { Button, Textarea, toast } from "@nexora/ui";
import { Reply, Trash2 } from "lucide-react";
import { createReplyAction, deleteReplyAction } from "@/actions/communication";

interface ForumReply {
  id: string;
  body: string;
  authorId: string;
  createdAt: Date | string;
  author: { name: string };
  replies: ForumReply[];
}

interface Props {
  threadId: string;
  currentUserId: string;
  isStaff: boolean;
  initialReplies: ForumReply[];
  locked: boolean;
}

export function ForumThreadView({ threadId, currentUserId, isStaff, initialReplies, locked }: Props) {
  const [replies, setReplies] = useState<ForumReply[]>(initialReplies);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function submitReply(parentId?: string) {
    if (!body.trim()) return;
    const text = body.trim();
    setBody("");
    setReplyingTo(null);

    startTransition(() => void (async () => {
      const r = await createReplyAction({ threadId, body: text, ...(parentId ? { parentId } : {}) });
      if (!r || "error" in r) { toast({ variant: "destructive", title: "Erro", description: r?.error }); return; }
      if ("replyId" in r) {
        const newReply: ForumReply = { id: r.replyId!, body: text, authorId: currentUserId, createdAt: new Date(), author: { name: "Você" }, replies: [] };
        if (parentId) {
          setReplies((prev) => prev.map((rep) => rep.id === parentId ? { ...rep, replies: [...rep.replies, newReply] } : rep));
        } else {
          setReplies((prev) => [...prev, newReply]);
        }
      }
    })());
  }

  function removeReply(id: string) {
    if (!confirm("Excluir esta resposta?")) return;
    setReplies((prev) => prev.filter((r) => r.id !== id).map((r) => ({ ...r, replies: r.replies.filter((rr) => rr.id !== id) })));
    startTransition(() => void deleteReplyAction(id));
  }

  return (
    <div className="space-y-4">
      <ReplyList replies={replies} currentUserId={currentUserId} isStaff={isStaff} onReply={(id) => setReplyingTo(id)} onDelete={removeReply} depth={0} />

      {!locked && (
        <div className="rounded-lg border border-navy-100 bg-white p-3 space-y-2">
          <p className="text-sm font-medium text-navy-700">{replyingTo ? "Respondendo..." : "Adicionar resposta"}</p>
          <Textarea rows={3} value={body} maxLength={10000} onChange={(e) => setBody(e.target.value)} placeholder="Sua resposta..." />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => submitReply(replyingTo ?? undefined)} disabled={isPending || !body.trim()}>
              Responder
            </Button>
            {replyingTo && <Button variant="secondary" size="sm" onClick={() => setReplyingTo(null)}>Cancelar</Button>}
          </div>
        </div>
      )}
      {locked && <p className="text-sm text-navy-400">Este tópico está bloqueado para novas respostas.</p>}
    </div>
  );
}

function ReplyList({ replies, currentUserId, isStaff, onReply, onDelete, depth }: {
  replies: ForumReply[];
  currentUserId: string;
  isStaff: boolean;
  onReply: (id: string) => void;
  onDelete: (id: string) => void;
  depth: number;
}) {
  return (
    <div className={`space-y-2 ${depth > 0 ? "ml-6 border-l-2 border-navy-50 pl-3" : ""}`}>
      {replies.map((r) => (
        <div key={r.id} className="rounded-lg border border-navy-100 bg-white p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <span className="text-xs font-medium text-navy-700">{r.author.name}</span>
              <span className="ml-2 text-xs text-navy-400">{new Date(r.createdAt).toLocaleDateString("pt-BR")}</span>
              <p className="mt-1 text-sm text-navy-800 whitespace-pre-wrap">{r.body}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              {depth === 0 && (
                <button onClick={() => onReply(r.id)} className="p-1 text-navy-300 hover:text-teal-600" aria-label="Responder">
                  <Reply className="h-3.5 w-3.5" />
                </button>
              )}
              {(r.authorId === currentUserId || isStaff) && (
                <button onClick={() => onDelete(r.id)} className="p-1 text-navy-300 hover:text-red-500" aria-label="Excluir">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          {r.replies.length > 0 && (
            <ReplyList replies={r.replies} currentUserId={currentUserId} isStaff={isStaff} onReply={onReply} onDelete={onDelete} depth={depth + 1} />
          )}
        </div>
      ))}
    </div>
  );
}
