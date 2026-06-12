"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Button, Textarea, toast } from "@nexora/ui";
import { Send } from "lucide-react";
import { sendMessageAction } from "@/actions/communication";

interface Msg {
  id: string;
  senderId: string;
  body: string;
  createdAt: Date | string;
  sender: { name: string };
}

interface Props {
  threadId: string;
  receiverId: string;
  currentUserId: string;
  initialMessages: Msg[];
}

export function MessageThread({ threadId, receiverId, currentUserId, initialMessages }: Props) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    const text = body.trim();
    if (!text) return;
    setBody("");
    startTransition(async () => {
      const r = await sendMessageAction({ receiverId, body: text, threadId });
      if (r && "error" in r) {
        toast({ variant: "destructive", title: "Erro", description: r.error });
        setBody(text);
        return;
      }
      if (r && "messageId" in r) {
        setMessages((prev) => [
          ...prev,
          { id: r.messageId!, senderId: currentUserId, body: text, createdAt: new Date(), sender: { name: "Você" } },
        ]);
      }
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 p-3">
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs rounded-lg px-3 py-2 text-sm ${mine ? "bg-teal-600 text-white" : "bg-navy-50 text-navy-800"}`}>
                {!mine && <p className="mb-0.5 text-xs font-medium opacity-70">{m.sender.name}</p>}
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={`mt-1 text-right text-xs opacity-60`}>
                  {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-navy-100 p-3 flex gap-2 items-end">
        <Textarea
          rows={2}
          className="resize-none flex-1"
          placeholder="Digite sua mensagem..."
          value={body}
          maxLength={5000}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }}}
        />
        <Button size="sm" onClick={send} disabled={isPending || !body.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
