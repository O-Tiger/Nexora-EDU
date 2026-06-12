import { NextResponse } from "next/server";
import { auth } from "@nexora/auth";
import { prisma } from "@nexora/db";
import { uploadToR2, getPresignedDownloadUrl } from "@/lib/r2";
import { createAuditLog } from "@nexora/db/src/queries/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const EXPORT_TTL_SECONDS = 24 * 60 * 60; // 24h

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id: userId, activeTenantId: tenantId } = session.user;

  const body = await req.json().catch(() => ({})) as { exportId?: string };
  const exportId = typeof body.exportId === "string" ? body.exportId : null;

  if (!exportId) return NextResponse.json({ error: "exportId obrigatório" }, { status: 400 });

  // Verify the export record belongs to this user and is PENDING
  const exportRecord = await prisma.userDataExport.findFirst({
    where: { id: exportId, userId, status: "PENDING" },
  });
  if (!exportRecord) return NextResponse.json({ error: "Exportação não encontrada" }, { status: 404 });

  // Collect all personal data — enrollments first (submissions depend on their IDs)
  const [user, enrollments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, cpf: true, phone: true, avatarUrl: true, createdAt: true, consentedAt: true },
    }),
    prisma.enrollment.findMany({
      where: { userId, tenantId },
      select: { id: true, courseId: true, status: true, expiresAt: true, createdAt: true },
    }),
  ]);

  const enrollmentIds = enrollments.map((e) => e.id);

  const [submissions, forumThreads, forumReplies, messages, auditLogs] = await Promise.all([
    prisma.submission.findMany({
      where: { tenantId, enrollmentId: { in: enrollmentIds } },
      select: { id: true, assessmentId: true, status: true, score: true, createdAt: true, submittedAt: true },
    }),
    prisma.forumThread.findMany({
      where: { tenantId, authorId: userId },
      select: { id: true, title: true, body: true, createdAt: true },
    }),
    prisma.forumReply.findMany({
      where: { tenantId, authorId: userId },
      select: { id: true, threadId: true, body: true, createdAt: true },
    }),
    prisma.directMessage.findMany({
      where: { tenantId, senderId: userId },
      select: { id: true, body: true, createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: { tenantId, userId },
      select: { action: true, resource: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user,
    enrollments,
    submissions,
    forum: { threads: forumThreads, replies: forumReplies },
    directMessages: messages,
    auditLog: auditLogs,
  };

  const json = JSON.stringify(payload, null, 2);
  const r2Key = `exports/${userId}/${Date.now()}.json`;
  const expiresAt = new Date(Date.now() + EXPORT_TTL_SECONDS * 1000);

  const r2Available = !!(
    process.env.CLOUDFLARE_R2_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_SECRET_KEY
  );

  let downloadUrl: string;

  if (r2Available) {
    try {
      await uploadToR2(r2Key, Buffer.from(json, "utf-8"), "application/json");
      downloadUrl = await getPresignedDownloadUrl(r2Key, EXPORT_TTL_SECONDS);
    } catch (err) {
      console.error(`[lgpd.export] R2 upload failed: ${err}`);
      return NextResponse.json({ error: "Falha ao gerar exportação. Tente novamente." }, { status: 500 });
    }
  } else {
    // Dev fallback: return JSON as data URI — browser downloads directly, no R2 needed
    const b64 = Buffer.from(json, "utf-8").toString("base64");
    downloadUrl = `data:application/json;base64,${b64}`;
  }

  await prisma.userDataExport.update({
    where: { id: exportId },
    data: { status: "READY", r2Key: r2Available ? r2Key : "local", expiresAt },
  });

  await createAuditLog(tenantId, userId, "lgpd.export_generated", `userDataExport:${exportId}`, {
    r2Key,
    expiresAt: expiresAt.toISOString(),
  });

  return NextResponse.json({ url: downloadUrl, expiresAt: expiresAt.toISOString() });
}
