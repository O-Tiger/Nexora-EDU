"use server";

import { auth } from "@nexora/auth";
import { prisma } from "@nexora/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId, id } = session.user;
  if (role !== "ADMINISTRATOR" && role !== "OWNER" && role !== "ASSISTANT") redirect("/unauthorized");
  return { tenantId: activeTenantId, userId: id };
}

const SignatureSchema = z.object({
  name: z.string().max(120),
  role: z.string().max(120),
  document: z.string().max(60).optional(),
});

const TemplateSchema = z.object({
  institutionName: z.string().min(1).max(160),
  subtitle: z.string().max(400).optional(),
  title: z.string().min(1).max(80),
  bodyTemplate: z.string().min(1).max(2000),
  signatures: z.array(SignatureSchema).max(4),
  logoUrl: z.string().url().optional().or(z.literal("")),
  city: z.string().max(80).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export async function upsertCertificateTemplateAction(input: unknown) {
  const { tenantId, userId } = await requireAdmin();
  const parsed = TemplateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const d = parsed.data;
  await prisma.certificateTemplate.upsert({
    where: { tenantId },
    create: {
      tenantId,
      institutionName: d.institutionName,
      subtitle: d.subtitle || null,
      title: d.title,
      bodyTemplate: d.bodyTemplate,
      signatures: d.signatures,
      logoUrl: d.logoUrl || null,
      city: d.city || null,
      accentColor: d.accentColor,
      updatedBy: userId,
    },
    update: {
      institutionName: d.institutionName,
      subtitle: d.subtitle || null,
      title: d.title,
      bodyTemplate: d.bodyTemplate,
      signatures: d.signatures,
      logoUrl: d.logoUrl || null,
      city: d.city || null,
      accentColor: d.accentColor,
      updatedBy: userId,
    },
  });

  revalidatePath("/admin/certificados");
  return { success: true };
}
