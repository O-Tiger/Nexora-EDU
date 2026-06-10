import { auth } from "@nexora/auth";
import { NextResponse } from "next/server";
import { getKnowledgeEntries } from "@nexora/db/src/queries/knowledge";
import { createAuditLog } from "@nexora/db/src/queries/audit";
import { ChatMessageSchema } from "@nexora/validators";
import Groq from "groq-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// A API do chatbot não salva histórico de sessão no banco — cada request é
// independente. O cliente pode enviar os últimos N turnos para contexto.

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Você é um assistente educacional da plataforma Nexora EDU.
Responda apenas sobre tópicos relacionados à plataforma, cursos, matrículas e ao conteúdo da base de conhecimento fornecida.
Se a dúvida estiver fora do seu escopo ou for muito complexa, responda com exatamente: "ESCALONAR"
Seja objetivo, amigável e responda em português do Brasil.`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { activeTenantId: tenantId, id: userId } = session.user;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const msgParsed = ChatMessageSchema.safeParse(
    typeof body === "object" && body !== null && "message" in body
      ? { message: (body as Record<string, unknown>).message }
      : body,
  );
  if (!msgParsed.success) return NextResponse.json({ error: "Mensagem inválida" }, { status: 400 });

  const history: Turn[] = [];
  if (
    typeof body === "object" &&
    body !== null &&
    "history" in body &&
    Array.isArray((body as Record<string, unknown>).history)
  ) {
    const raw = (body as Record<string, unknown>).history as unknown[];
    for (const t of raw.slice(-6)) {
      if (
        typeof t === "object" &&
        t !== null &&
        "role" in t &&
        "content" in t &&
        typeof (t as Record<string, unknown>).content === "string" &&
        ((t as Record<string, unknown>).role === "user" || (t as Record<string, unknown>).role === "assistant")
      ) {
        history.push(t as Turn);
      }
    }
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply: "O assistente não está disponível no momento. Entre em contato com a secretaria.",
      escalated: false,
    });
  }

  // RAG: busca base de conhecimento ativa do tenant
  const entries = await getKnowledgeEntries(tenantId, true);
  const context = entries.length > 0
    ? `\n\nBase de conhecimento:\n${entries.map((e) => `P: ${e.question}\nR: ${e.answer}`).join("\n\n")}`
    : "";

  const groq = new Groq({ apiKey });

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT + context },
    ...history,
    { role: "user", content: msgParsed.data.message },
  ];

  let reply: string;
  try {
    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages,
      max_tokens: 600,
      temperature: 0.4,
    });
    reply = completion.choices[0]?.message?.content?.trim() ?? "Não foi possível processar a resposta.";
  } catch (e) {
    console.error("[chat.POST] Groq error:", e);
    return NextResponse.json({ error: "Serviço temporariamente indisponível" }, { status: 503 });
  }

  const escalated = reply.includes("ESCALONAR");
  if (escalated) {
    // Registra intenção de escalonamento — Digisac (sendWhatsApp) ainda é stub
    await createAuditLog(tenantId, userId, "chatbot.escalated", undefined, {
      message: msgParsed.data.message.slice(0, 200),
    });
    reply = "Essa dúvida precisa de atenção especializada. Um responsável da secretaria entrará em contato em breve.";
  }

  return NextResponse.json({ reply, escalated });
}
