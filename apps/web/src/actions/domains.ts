"use server";

import { auth } from "@nexora/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDomain, removeDomain, normalizeDomain } from "@nexora/db/src/queries/domains";
import { createAuditLog } from "@nexora/db/src/queries/audit";

async function requireAdmin() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId, id } = session.user;
  if (role !== "ADMINISTRATOR" && role !== "OWNER") redirect("/unauthorized");
  return { tenantId: activeTenantId, userId: id };
}

const DomainSchema = z.string().min(3).max(253).regex(
  /^([a-z0-9-]+\.)+[a-z]{2,}$/i,
  "Domínio inválido (ex: cursos.suaescola.com.br)",
);

export async function addDomainAction(formData: FormData) {
  const { tenantId, userId } = await requireAdmin();
  const raw = String(formData.get("domain") ?? "");
  const isPrimary = formData.get("isPrimary") === "true";

  const normalized = normalizeDomain(raw);
  const parsed = DomainSchema.safeParse(normalized);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Domínio inválido" };

  try {
    await addDomain(tenantId, normalized, isPrimary);
  } catch {
    return { error: "Este domínio já está em uso." };
  }
  await createAuditLog(tenantId, userId, "domain.added", undefined, { domain: normalized });
  revalidatePath("/admin/dominios");
  return { success: true };
}

export async function removeDomainAction(id: string) {
  const { tenantId } = await requireAdmin();
  await removeDomain(id, tenantId);
  revalidatePath("/admin/dominios");
  return { success: true };
}
