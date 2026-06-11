import { NextResponse } from "next/server";
import { prisma } from "@nexora/db";
import { createAuditLog } from "@nexora/db/src/queries/audit";

export const dynamic = "force-dynamic";

// Digisac sends a Bearer token in Authorization header for webhook verification.
// Set DIGISAC_WEBHOOK_SECRET to the value configured in the Digisac dashboard.

export async function POST(req: Request) {
  const secret = process.env.DIGISAC_WEBHOOK_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
    if (token !== secret) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  // Digisac webhook payload structure:
  // { event: "message.created", data: { from: "5511999999999", text: "...", contact: { name: "..." } } }
  if (payload.event !== "message.created") {
    return NextResponse.json({ ok: true });
  }

  const data = payload.data as Record<string, unknown> | undefined;
  const phone = typeof data?.from === "string" ? data.from.replace(/\D/g, "") : null;
  const text = typeof data?.text === "string" ? data.text.trim() : null;

  if (!phone || !text) {
    return NextResponse.json({ ok: true });
  }

  // Find user by phone across all tenants
  const user = await prisma.user.findFirst({
    where: { phone },
    select: { id: true, name: true },
  });

  if (!user) {
    // Unknown contact — log and ignore
    console.warn(`[digisac.webhook] Inbound message from unknown phone ${phone}`);
    return NextResponse.json({ ok: true });
  }

  // Determine tenant from membership (prefer inst_a, which has Digisac)
  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: user.id, active: true },
    orderBy: { createdAt: "asc" },
    select: { tenantId: true },
  });

  if (!membership) return NextResponse.json({ ok: true });
  const tenantId = membership.tenantId;

  // Find an admin to receive the message (first ADMIN of the tenant)
  const adminMembership = await prisma.tenantMembership.findFirst({
    where: { tenantId, role: { in: ["ADMIN", "SUPER_ADMIN"] }, active: true },
    select: { userId: true },
  });

  if (!adminMembership) return NextResponse.json({ ok: true });

  // Route to DirectMessage: reuse existing thread or create new one
  const threadId = `digisac:${user.id}:${tenantId}`;

  await prisma.directMessage.create({
    data: {
      tenantId,
      threadId,
      senderId: user.id,
      receiverId: adminMembership.userId,
      body: text,
    },
  });

  await createAuditLog(tenantId, user.id, "whatsapp.inbound", `thread:${threadId}`, {
    phone,
    preview: text.slice(0, 100),
  });

  return NextResponse.json({ ok: true });
}
