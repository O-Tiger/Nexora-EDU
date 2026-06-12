"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Button, Textarea } from "@nexora/ui";
import { MessageSquare, X, Send, Bot } from "lucide-react";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([
    { role: "assistant", content: "Olá! Sou o assistente Nexora. Como posso ajudar?" },
  ]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, open]);

  function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setTurns((prev) => [...prev, { role: "user", content: text }]);

    startTransition(async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history: turns.slice(-6) }),
        });
        const data = (await res.json()) as { reply?: string; error?: string };
        setTurns((prev) => [
          ...prev,
          { role: "assistant", content: data.reply ?? data.error ?? "Erro ao obter resposta." },
        ]);
      } catch {
        setTurns((prev) => [...prev, { role: "assistant", content: "Não foi possível conectar ao assistente." }]);
      }
    });
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg transition hover:bg-teal-700 active:scale-95"
        aria-label="Abrir assistente"
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>

      {/* Painel do chat */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex w-80 flex-col rounded-xl border border-navy-100 bg-white shadow-xl sm:w-96" style={{ height: 420 }}>
          <div className="flex items-center gap-2 rounded-t-xl border-b border-navy-100 bg-teal-600 px-4 py-3 text-white">
            <Bot className="h-4 w-4" />
            <span className="text-sm font-semibold">Assistente Nexora</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 p-3">
            {turns.map((t, i) => (
              <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${t.role === "user" ? "bg-teal-600 text-white" : "bg-navy-50 text-navy-800"}`}>
                  {t.content}
                </div>
              </div>
            ))}
            {isPending && (
              <div className="flex justify-start">
                <div className="bg-navy-50 rounded-lg px-3 py-2 text-sm text-navy-400">...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-navy-100 p-2 flex gap-2 items-end">
            <Textarea
              rows={1}
              className="resize-none flex-1 text-sm"
              placeholder="Digite sua dúvida..."
              value={input}
              maxLength={2000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }}}
            />
            <Button size="sm" onClick={send} disabled={isPending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
