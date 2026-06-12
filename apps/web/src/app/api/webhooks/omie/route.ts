import { NextResponse } from "next/server";
import { prisma } from "@nexora/db";
import { createAuditLog } from "@nexora/db/src/queries/audit";

export const dynamic = "force-dynamic";

// Omie sends a shared secret in the X-Omie-Token header (configured in Omie portal).
// Set OMIE_WEBHOOK_SECRET to match.

export async function POST(req: Request) {
  const secret = process.env.OMIE_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-omie-token") !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  // Omie webhook event types we care about:
  // "ContaReceberPaga" — a receivable was paid
  // "ContaReceberCancelada" — a receivable was cancelled
  const event = typeof payload.event === "string" ? payload.event : null;
  const topic = typeof payload.topic === "string" ? payload.topic : null;
  const lancamentoId = String(
    (payload.param as Record<string, unknown>)?.nCodLancamento ??
    (payload.param as Record<string, unknown>)?.nCodTitulo ??
    "",
  );

  if (!lancamentoId) return NextResponse.json({ ok: true });

  const sync = await prisma.omieSync.findFirst({
    where: { omieReceivableId: lancamentoId },
  });

  if (!sync) return NextResponse.json({ ok: true });

  if (event === "ContaReceberPaga" || topic === "ContaReceberPaga") {
    // Payment confirmed — nothing to change on enrollment for now (enrollment is already ACTIVE)
    // TODO(fase-3-financeiro): trigger invoice generation / certificate unlock if applicable
    await createAuditLog(sync.tenantId, sync.enrollmentId, "omie.payment_confirmed", `omieSync:${sync.id}`, {
      omieReceivableId: lancamentoId,
    });
  } else if (event === "ContaReceberCancelada" || topic === "ContaReceberCancelada") {
    // Receivable cancelled — log only; business decision on whether to suspend enrollment
    // belongs to Phase 3 financial flow
    await createAuditLog(sync.tenantId, sync.enrollmentId, "omie.receivable_cancelled", `omieSync:${sync.id}`, {
      omieReceivableId: lancamentoId,
    });
  }

  return NextResponse.json({ ok: true });
}
