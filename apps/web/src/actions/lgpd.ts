"use server";

import { auth } from "@nexora/auth";
import { prisma } from "@nexora/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@nexora/db/src/queries/audit";

export async function acceptConsentAction() {
  const session = await auth();
  if (!session) redirect("/login");
  const userId = session.user.id;

  await prisma.user.update({
    where: { id: userId },
    data: { consentedAt: new Date() },
  });

  await createAuditLog(session.user.activeTenantId, userId, "lgpd.consent_accepted", `user:${userId}`, {});
  redirect("/aluno");
}

export async function requestDataExportAction(): Promise<{ exportId: string } | { error: string }> {
  const session = await auth();
  if (!session) redirect("/login");
  const { id: userId, activeTenantId: tenantId } = session.user;

  // Rate limit: max 1 export request per 24h
  const recent = await prisma.userDataExport.findFirst({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recent) return { error: "Você já solicitou uma exportação nas últimas 24 horas." };

  const exportRecord = await prisma.userDataExport.create({
    data: { userId, tenantId, status: "PENDING" },
  });

  await createAuditLog(tenantId, userId, "lgpd.export_requested", `userDataExport:${exportRecord.id}`, {});
  revalidatePath("/aluno/meus-dados");
  return { exportId: exportRecord.id };
}

export async function requestAccountDeletionAction(): Promise<{ ok: true } | { error: string }> {
  const session = await auth();
  if (!session) redirect("/login");
  const { id: userId, activeTenantId: tenantId } = session.user;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { anonymizedAt: true } });
  if (user?.anonymizedAt) return { error: "Esta conta já foi anonimizada." };

  // Anonymize immediately — LGPD art. 18 right to erasure
  const anonEmail = `removed-${userId}@nexora.deleted`;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        name: "Usuário Removido",
        email: anonEmail,
        phone: null,
        cpf: null,
        avatarUrl: null,
        consentedAt: null,
        anonymizedAt: new Date(),
      },
    }),
    // Deactivate all memberships so the account can't log in
    prisma.tenantMembership.updateMany({
      where: { userId },
      data: { active: false },
    }),
  ]);

  await createAuditLog(tenantId, userId, "lgpd.account_anonymized", `user:${userId}`, {
    requestedAt: new Date().toISOString(),
  });

  redirect("/login?conta-removida=1");
}
