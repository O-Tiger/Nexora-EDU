"use server";

import { auth } from "@nexora/auth";
import { prisma } from "@nexora/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const WHATSAPP_EVENTS = [
  "enrollment.created",
  "enrollment.expiring",
  "enrollment.expired",
  "enrollment.reactivated",
  "certificate.issued",
  "live.reminder",
  "assessment.deadline",
] as const;

const TemplateSchema = z.object({
  event: z.enum(WHATSAPP_EVENTS),
  bodyTemplate: z.string().min(1).max(1000),
  isActive: z.boolean().default(true),
});

async function requireAdmin() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId, id } = session.user;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "COORDENADOR") redirect("/unauthorized");
  return { tenantId: activeTenantId, userId: id };
}

export async function upsertWhatsAppTemplateAction(formData: FormData) {
  const { tenantId, userId } = await requireAdmin();

  const parsed = TemplateSchema.safeParse({
    event: formData.get("event"),
    bodyTemplate: formData.get("bodyTemplate"),
    isActive: formData.get("isActive") !== "false",
  });

  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  const { event, bodyTemplate, isActive } = parsed.data;

  await prisma.whatsAppTemplate.upsert({
    where: { tenantId_event: { tenantId, event } },
    create: { tenantId, event, bodyTemplate, isActive, updatedBy: userId },
    update: { bodyTemplate, isActive, updatedBy: userId },
  });

  revalidatePath("/admin/comunicacao/whatsapp");
  return { success: true };
}

export async function toggleWhatsAppTemplateAction(event: string, isActive: boolean) {
  const { tenantId, userId } = await requireAdmin();

  await prisma.whatsAppTemplate.updateMany({
    where: { tenantId, event },
    data: { isActive, updatedBy: userId },
  });

  revalidatePath("/admin/comunicacao/whatsapp");
}
