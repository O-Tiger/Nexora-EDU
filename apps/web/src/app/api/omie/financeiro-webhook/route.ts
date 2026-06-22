import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@nexora/db";
import { getReservaByMensalidadeId } from "@nexora/db/src/queries/reservas";

// Omie envia um token fixo configurado no painel (Settings > Webhooks > Token).
// Armazenado em OMIE_WEBHOOK_TOKEN — rejeita qualquer request sem o header correto.
function verifyOmieToken(req: NextRequest): boolean {
  const token = req.headers.get("x-omie-webhook-token") ?? req.nextUrl.searchParams.get("token");
  const expected = process.env.OMIE_WEBHOOK_TOKEN;
  if (!expected) {
    console.warn("[omie-webhook] OMIE_WEBHOOK_TOKEN not set — rejecting all requests");
    return false;
  }
  return token === expected;
}

type OmieWebhookPayload = {
  tipo: string;
  codigo_lancamento?: number;
  // Omie pode variar o shape — validamos só o que usamos
  [key: string]: unknown;
};

export async function POST(req: NextRequest) {
  if (!verifyOmieToken(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: OmieWebhookPayload;
  try {
    body = await req.json() as OmieWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Só processa eventos de baixa de conta a receber
  if (body.tipo !== "ContaReceber" || !body.codigo_lancamento) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const omieReceivableId = String(body.codigo_lancamento);

  const mensalidade = await prisma.mensalidade.findFirst({
    where: { omieReceivableId },
  });

  if (!mensalidade) {
    // Pode ser de um OmieSync EAD — não é erro
    return NextResponse.json({ ok: true, skipped: true });
  }

  if (mensalidade.status === "PAGA") {
    return NextResponse.json({ ok: true, already_paid: true });
  }

  await prisma.mensalidade.update({
    where: { id: mensalidade.id },
    data: { status: "PAGA", paidAt: new Date(), omieSyncStatus: "SYNCED" },
  });

  // Se for taxa de reserva, marca a ReservaVaga como PAGA
  if (mensalidade.tipo === "TAXA_RESERVA") {
    const reserva = await getReservaByMensalidadeId(mensalidade.id);
    if (reserva?.status === "PENDENTE") {
      await prisma.reservaVaga.update({ where: { id: reserva.id }, data: { status: "PAGA" } });
      console.info(`[omie-webhook] ReservaVaga ${reserva.id} marcada como PAGA`);
    }
  }

  console.info(`[omie-webhook] Mensalidade ${mensalidade.id} marcada como PAGA`);
  return NextResponse.json({ ok: true });
}
