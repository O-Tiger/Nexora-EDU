"use server";

import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Role } from "@nexora/db";
import { upsertAvaliacaoConfig, deleteAvaliacaoConfig } from "@nexora/db/src/queries/avaliacoes";

const ADMIN_ROLES: Role[] = ["OWNER", "ADMINISTRATOR"];

async function requireAdmin() {
  const session = await auth();
  if (!session) redirect("/login" as never);
  const { role, activeTenantId, id } = session.user;
  if (!ADMIN_ROLES.includes(role)) redirect("/unauthorized" as never);
  return { tenantId: activeTenantId, userId: id };
}

// Two id shapes exist: Prisma cuid() for rows created in the app, and UUIDs for the default
// configs seeded by the 20260626000000_add_avaliacao_config migration (gen_random_uuid()).
const ID_ERROR = "ID de avaliação inválido.";
const AvaliacaoId = z.union(
  [z.string().max(40, ID_ERROR).cuid(ID_ERROR), z.string().uuid(ID_ERROR)],
  { errorMap: () => ({ message: ID_ERROR }) },
);

const AvaliacaoSchema = z.object({
  id: AvaliacaoId.optional(),
  sigla: z.string().min(1).max(20),
  label: z.string().min(1).max(100),
  periodo: z.coerce.number().int().min(0).max(10),
  isRecuperacao: z.coerce.boolean(),
  tipo: z.enum(["NOTA", "SOMA", "MEDIA", "CONCEITO", "SEM_INFLUENCIA"]),
  peso: z.coerce.number().min(0).max(100).optional().nullable(),
  obrigatoria: z.coerce.boolean(),
  ordem: z.coerce.number().int().min(1),
});

export async function saveAvaliacaoConfigAction(input: unknown) {
  const { tenantId } = await requireAdmin();
  const parsed = AvaliacaoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  try {
    const { id, peso, ...rest } = parsed.data;
    await upsertAvaliacaoConfig(tenantId, { ...rest, peso: peso ?? null, ...(id ? { id } : {}) });
    revalidatePath("/admin/secretaria/avaliacoes");
    return { success: true };
  } catch (e) {
    console.error("[saveAvaliacaoConfigAction]", e);
    return { error: "Erro ao salvar avaliação." };
  }
}

export async function deleteAvaliacaoConfigAction(id: string) {
  const { tenantId } = await requireAdmin();
  const parsedId = AvaliacaoId.safeParse(id);
  if (!parsedId.success) return { error: ID_ERROR };

  try {
    await deleteAvaliacaoConfig(parsedId.data, tenantId);
    revalidatePath("/admin/secretaria/avaliacoes");
    return { success: true };
  } catch (e) {
    console.error("[deleteAvaliacaoConfigAction]", e);
    return { error: "Erro ao remover avaliação. Verifique se há notas lançadas." };
  }
}
