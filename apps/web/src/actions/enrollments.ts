"use server";

import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { enrollUser, reactivateEnrollment } from "@nexora/db/src/queries/enrollments-admin";
import { prisma } from "@nexora/db";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId } = session.user;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "COORDENADOR") redirect("/unauthorized");
  return { tenantId: activeTenantId };
}

const EnrollSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1),
  expiresAt: z.string().optional(),
});

export async function enrollUserAction(formData: FormData) {
  const { tenantId } = await requireAdmin();

  const parsed = EnrollSchema.safeParse({
    userId: formData.get("userId"),
    courseId: formData.get("courseId"),
    expiresAt: formData.get("expiresAt") ?? undefined,
  });

  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const { userId, courseId, expiresAt } = parsed.data;

  // Verificar que userId e courseId pertencem ao tenant
  const [user, course] = await Promise.all([
    prisma.tenantMembership.findFirst({ where: { userId, tenantId, active: true } }),
    prisma.course.findFirst({ where: { id: courseId, tenantId } }),
  ]);

  if (!user) return { error: "Aluno não encontrado neste tenant" };
  if (!course) return { error: "Curso não encontrado" };

  await enrollUser({
    userId,
    courseId,
    tenantId,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
  });

  revalidatePath("/admin/matriculas");
  return { success: true };
}

export async function reactivateEnrollmentAction(id: string, expiresAt?: string) {
  const { tenantId } = await requireAdmin();

  // Verificar ownership
  const enrollment = await prisma.enrollment.findFirst({ where: { id, tenantId } });
  if (!enrollment) return { error: "Matrícula não encontrada" };

  // Janela de reativação: só pode reativar se expirou há menos de 7 dias
  if (enrollment.status === "EXPIRED" && enrollment.expiresAt) {
    const daysSinceExpiry =
      (Date.now() - enrollment.expiresAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceExpiry > 7) {
      return { error: "Fora da janela de reativação (máx. 7 dias após expiração)" };
    }
  }

  await reactivateEnrollment(id, expiresAt ? new Date(expiresAt) : undefined);
  revalidatePath("/admin/matriculas");
  return { success: true };
}
