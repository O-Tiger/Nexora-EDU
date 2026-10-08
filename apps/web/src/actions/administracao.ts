"use server";

import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@nexora/db";
import { hash } from "argon2";
import { upsertTenantConfig } from "@nexora/db/src/queries/administracao";
import { uploadToR2 } from "@/lib/r2";
import type { Role } from "@nexora/db";

const INTERNAL_ROLES: Role[] = ["OWNER", "ADMINISTRATOR", "TI_SUPPORT"];

async function requireAdmin() {
  const session = await auth();
  if (!session) redirect("/login" as never);
  const { role, activeTenantId, id } = session.user;
  if (!INTERNAL_ROLES.includes(role)) redirect("/unauthorized" as never);
  return { tenantId: activeTenantId, userId: id, role };
}

// ─── Funcionários ─────────────────────────────────────────────────────────────

const CriarFuncionarioSchema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  role:     z.enum(["ADMINISTRATOR", "TI_SUPPORT"]),
  tenantId: z.string(),
});

export async function criarFuncionarioAction(fd: FormData) {
  await requireAdmin();
  const parsed = CriarFuncionarioSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Dados inválidos" };
  const { name, email, role, tenantId } = parsed.data;

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  let tempPassword: string | null = null;

  if (!user) {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const arr = new Uint8Array(12);
    crypto.getRandomValues(arr);
    tempPassword = Array.from(arr).map((b) => chars[b % chars.length]).join("");
    const passwordHash = await hash(tempPassword);
    user = await prisma.user.create({ data: { name, email, passwordHash } });
  }

  const existing = await prisma.tenantMembership.findFirst({
    where: { userId: user.id, tenantId },
  });
  if (existing) {
    await prisma.tenantMembership.update({
      where: { id: existing.id },
      data: { role, active: true },
    });
  } else {
    await prisma.tenantMembership.create({ data: { userId: user.id, tenantId, role } });
  }

  revalidatePath("/admin/administracao/funcionarios");
  return { success: true, tempPassword };
}

export async function removerFuncionarioAction(membershipId: string) {
  const { userId } = await requireAdmin();
  const membership = await prisma.tenantMembership.findUnique({
    where: { id: membershipId },
    select: { userId: true },
  });
  if (!membership) return { error: "Não encontrado" };
  if (membership.userId === userId) return { error: "Não é possível remover a si mesmo" };

  await prisma.tenantMembership.update({
    where: { id: membershipId },
    data: { active: false },
  });
  revalidatePath("/admin/administracao/funcionarios");
  return { success: true };
}

// ─── Suporte Técnico ──────────────────────────────────────────────────────────

export async function resetSenhaAction(targetUserId: string) {
  await requireAdmin();
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  const tempPassword = Array.from(arr).map((b) => chars[b % chars.length]).join("");
  const passwordHash = await hash(tempPassword);
  await prisma.user.update({ where: { id: targetUserId }, data: { passwordHash } });
  return { success: true, tempPassword };
}

const AlterarRoleSchema = z.object({
  membershipId: z.string(),
  role: z.enum(["ADMINISTRATOR", "TI_SUPPORT", "ASSISTANT", "PROFESSOR"]),
});

export async function alterarRoleAction(fd: FormData) {
  const { userId, role: callerRole } = await requireAdmin();
  const parsed = AlterarRoleSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Dados inválidos" };

  const membership = await prisma.tenantMembership.findUnique({
    where: { id: parsed.data.membershipId },
    select: { userId: true, role: true },
  });
  if (!membership) return { error: "Não encontrado" };
  if (membership.userId === userId) return { error: "Não é possível alterar o próprio role" };
  if (membership.role === "OWNER") return { error: "Role OWNER não pode ser alterado aqui" };
  if (parsed.data.role === "ADMINISTRATOR" && callerRole !== "OWNER" && callerRole !== "ADMINISTRATOR") {
    return { error: "Sem permissão para promover a Administrador" };
  }

  await prisma.tenantMembership.update({
    where: { id: parsed.data.membershipId },
    data: { role: parsed.data.role },
  });
  revalidatePath("/admin/administracao/suporte");
  return { success: true };
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

const LOGO_MAGIC: Record<string, number[]> = {
  "image/png":  [0x89, 0x50, 0x4e, 0x47],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
};
const LOGO_EXTS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export async function uploadLogoAction(fd: FormData) {
  const { tenantId } = await requireAdmin();
  const file = fd.get("logo");
  if (!(file instanceof File)) return { error: "Arquivo inválido" };
  if (file.size > LOGO_MAX_BYTES) return { error: "Logo deve ter no máximo 2MB" };

  const mime = file.type;
  const magic = LOGO_MAGIC[mime];
  const ext = LOGO_EXTS[mime];
  if (!magic || !ext) return { error: "Formato não suportado. Use PNG, JPEG ou WebP." };

  const buf = Buffer.from(await file.arrayBuffer());
  if (!magic.every((b, i) => buf[i] === b)) return { error: "Conteúdo do arquivo não confere com o formato declarado" };

  const key = `${tenantId}/logos/logo.${ext}`;
  try {
    await uploadToR2(key, buf, mime);
  } catch {
    return { error: "Falha ao fazer upload. Verifique as credenciais do R2." };
  }

  // Store the serving route URL (stable, doesn't expire)
  const logoUrl = `/api/logo/${tenantId}`;
  await upsertTenantConfig(tenantId, { logoUrl });
  revalidatePath("/admin/administracao/configuracoes");
  revalidatePath("/admin");
  return { success: true, logoUrl };
}

// ─── Configurações ────────────────────────────────────────────────────────────

const ConfigSchema = z.object({
  tenantId:      z.string(),
  schoolName:    z.string().max(200).optional(),
  schoolAddress: z.string().max(400).optional(),
  cnpj:          z.string().max(20).optional(),
  emailDomain:   z.string().max(100).optional(),
  emailTemplate: z.string().max(200).optional(),
  periodos:      z.coerce.number().int().refine((v) => [2, 3, 4].includes(v)).optional(),
});

export async function salvarConfigAction(fd: FormData) {
  await requireAdmin();
  const parsed = ConfigSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Dados inválidos" };

  const { tenantId, ...data } = parsed.data;
  await upsertTenantConfig(tenantId, {
    schoolName:    data.schoolName    || null,
    schoolAddress: data.schoolAddress || null,
    cnpj:          data.cnpj          || null,
    emailDomain:   data.emailDomain   || null,
    emailTemplate: data.emailTemplate || null,
    ...(data.periodos != null && { periodos: data.periodos }),
  });
  revalidatePath("/admin/administracao/configuracoes");
  return { success: true };
}
