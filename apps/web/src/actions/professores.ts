"use server";

import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createProfessor, deleteProfessor } from "@nexora/db/src/queries/professores";

/** Apenas papéis com acesso interno podem cadastrar/excluir professores. */
async function requireInternal() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId } = session.user;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "COORDENADOR") redirect("/unauthorized");
  return { tenantId: activeTenantId };
}

const ProfessorSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
});

export async function createProfessorAction(formData: FormData) {
  const { tenantId } = await requireInternal();
  const parsed = ProfessorSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  await createProfessor({
    tenantId,
    name: parsed.data.name,
    ...(parsed.data.email && { email: parsed.data.email }),
    ...(parsed.data.phone && { phone: parsed.data.phone }),
  });
  revalidatePath("/admin/secretaria/professores");
  return { success: true };
}

export async function deleteProfessorAction(id: string) {
  const { tenantId } = await requireInternal();
  await deleteProfessor(id, tenantId);
  revalidatePath("/admin/secretaria/professores");
  return { success: true };
}
