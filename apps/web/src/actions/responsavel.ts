"use server";

import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@nexora/db";
import { hash } from "argon2";
import { createAuditLog } from "@nexora/db/src/queries/audit";

async function requireAdmin() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId, id } = session.user;
  if (role !== "ADMINISTRATOR" && role !== "OWNER" && role !== "ASSISTANT") redirect("/unauthorized");
  return { tenantId: activeTenantId, userId: id };
}

/**
 * Cria uma conta de acesso ao portal para um responsável.
 * Gera senha temporária, cria User + TenantMembership RESPONSAVEL,
 * e vincula ao Guardian.userId.
 * Retorna a senha temporária em texto para o admin comunicar à família.
 */
export async function createResponsavelAccountAction(guardianId: string) {
  const { tenantId, userId } = await requireAdmin();

  const guardian = await prisma.guardian.findFirst({
    where: { id: guardianId, tenantId },
  });
  if (!guardian) return { error: "Responsável não encontrado" };
  if (!guardian.email) return { error: "Responsável não tem email cadastrado — adicione um email primeiro" };
  if (guardian.userId) return { error: "Este responsável já possui acesso ao portal" };

  // Verifica se já existe User com este email
  const existingUser = await prisma.user.findUnique({ where: { email: guardian.email } });

  // Senha temporária: 10 chars alfanuméricos
  const tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31])
    .join("");

  const passwordHash = await hash(tempPassword);

  let responsavelUserId: string;

  if (existingUser) {
    // Usuário já existe — apenas adiciona membership RESPONSAVEL se não tiver
    const existing = await prisma.tenantMembership.findUnique({
      where: { userId_tenantId_role: { userId: existingUser.id, tenantId, role: "RESPONSIBLE" } },
    });
    if (!existing) {
      await prisma.tenantMembership.create({
        data: { userId: existingUser.id, tenantId, role: "RESPONSIBLE" },
      });
    }
    responsavelUserId = existingUser.id;
  } else {
    // Cria novo User
    const newUser = await prisma.user.create({
      data: {
        email: guardian.email,
        passwordHash,
        name: guardian.name,
        memberships: {
          create: { tenantId, role: "RESPONSIBLE" },
        },
      },
    });
    responsavelUserId = newUser.id;
  }

  // Vincula ao Guardian
  await prisma.guardian.update({
    where: { id: guardianId },
    data: { userId: responsavelUserId },
  });

  await createAuditLog(tenantId, userId, "responsavel.account_created", `guardian:${guardianId}`, {
    name: guardian.name, email: guardian.email,
  });

  revalidatePath(`/admin/secretaria/alunos/${guardian.studentId}`);

  // Retorna senha temporária APENAS para exibir ao admin — nunca logada nem persistida
  return { success: true, tempPassword, email: guardian.email, isExistingUser: !!existingUser };
}

export async function revokeResponsavelAccountAction(guardianId: string) {
  const { tenantId, userId } = await requireAdmin();

  const guardian = await prisma.guardian.findFirst({ where: { id: guardianId, tenantId } });
  if (!guardian?.userId) return { error: "Responsável não tem conta ativa" };

  // Remove membership RESPONSAVEL (não apaga o User — pode ter outros vínculos)
  await prisma.tenantMembership.deleteMany({
    where: { userId: guardian.userId, tenantId, role: "RESPONSIBLE" },
  });

  await prisma.guardian.update({ where: { id: guardianId }, data: { userId: null } });

  await createAuditLog(tenantId, userId, "responsavel.account_revoked", `guardian:${guardianId}`, { name: guardian.name });
  revalidatePath(`/admin/secretaria/alunos/${guardian.studentId}`);
  return { success: true };
}
