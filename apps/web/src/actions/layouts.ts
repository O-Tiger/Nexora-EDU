"use server";

import { auth } from "@nexora/auth";
import {
  saveDraft,
  publishBlocks,
  rollbackToVersion,
  deleteVersion,
  clearDraft,
  getPageConfig,
  setPageLive,
  setPageUnpublished,
  setPageArchived,
  setPageUnarchived,
  getEditorBlocks,
  listVersions,
} from "@nexora/db/src/queries/layouts";
import { createAuditLog } from "@nexora/db/src/queries/audit";
import { PageBlocksSchema, PageTypeSchema } from "@nexora/validators";
import type { Prisma } from "@nexora/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Controle de acesso: edição de layout é restrita a ADMIN/OWNER
// (equivalente à permissão `editor:layout` da spec).
async function requireLayoutEditor() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId, id } = session.user;
  if (role !== "ADMINISTRATOR" && role !== "OWNER") {
    redirect("/unauthorized");
  }
  return { tenantId: activeTenantId, userId: id };
}

function parse(pageType: string, blocks: unknown) {
  const pt = PageTypeSchema.safeParse(pageType);
  if (!pt.success) return { error: "Tipo de página inválido" as const };

  const parsed = PageBlocksSchema.safeParse(blocks);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Blocos inválidos" };
  }
  return { pageType: pt.data, blocks: parsed.data };
}

export async function saveDraftAction(pageType: string, blocks: unknown) {
  const { tenantId, userId } = await requireLayoutEditor();
  const r = parse(pageType, blocks);
  if ("error" in r) return { error: r.error };

  await saveDraft(tenantId, r.pageType, r.blocks as unknown as Prisma.InputJsonValue, userId);
  revalidatePath(`/admin/paginas/${r.pageType}`);
  return { success: true };
}

export async function publishLayoutAction(pageType: string, blocks: unknown) {
  const { tenantId, userId } = await requireLayoutEditor();
  const r = parse(pageType, blocks);
  if ("error" in r) return { error: r.error };

  const created = await publishBlocks(
    tenantId,
    r.pageType,
    r.blocks as unknown as Prisma.InputJsonValue,
    userId,
  );

  await Promise.all([
    createAuditLog(tenantId, userId, "layout.publish", `pageLayout:${created.id}`, {
      pageType: r.pageType,
      version: created.version,
      blockCount: r.blocks.length,
    }),
    setPageLive(tenantId, r.pageType, userId),
  ]);

  revalidatePath(`/admin/paginas/${r.pageType}`);
  revalidatePath(`/p/${r.pageType}`);
  return { success: true, version: created.version };
}

export async function rollbackLayoutAction(pageType: string, version: number) {
  const { tenantId, userId } = await requireLayoutEditor();
  const pt = PageTypeSchema.safeParse(pageType);
  if (!pt.success) return { error: "Tipo de página inválido" };
  if (!Number.isInteger(version) || version < 1) return { error: "Versão inválida" };

  const created = await rollbackToVersion(tenantId, pt.data, version, userId);
  if (!created) return { error: "Versão não encontrada" };

  await createAuditLog(tenantId, userId, "layout.rollback", `pageLayout:${created.id}`, {
    pageType: pt.data,
    restoredFrom: version,
    newVersion: created.version,
  });

  revalidatePath(`/admin/paginas/${pt.data}`);
  revalidatePath(`/p/${pt.data}`);
  return { success: true, version: created.version };
}

export async function deleteVersionAction(pageType: string, versionId: string) {
  const { tenantId } = await requireLayoutEditor();
  const pt = PageTypeSchema.safeParse(pageType);
  if (!pt.success) return { error: "Tipo de página inválido" };
  if (!versionId) return { error: "ID de versão inválido" };

  const deleted = await deleteVersion(tenantId, pt.data, versionId);
  if (!deleted) return { error: "Não é possível deletar a única versão publicada" };

  revalidatePath(`/admin/paginas/${pt.data}`);
  return { success: true };
}

export async function clearPageAction(pageType: string) {
  const { tenantId, userId } = await requireLayoutEditor();
  const pt = PageTypeSchema.safeParse(pageType);
  if (!pt.success) return { error: "Tipo de página inválido" };

  await clearDraft(tenantId, pt.data);
  await saveDraft(tenantId, pt.data, [] as unknown as import("@nexora/db").Prisma.InputJsonValue, userId);

  revalidatePath(`/admin/paginas/${pt.data}`);
  return { success: true };
}

export async function unpublishPageAction(pageType: string) {
  const { tenantId, userId } = await requireLayoutEditor();
  const pt = PageTypeSchema.safeParse(pageType);
  if (!pt.success) return { error: "Tipo de página inválido" };
  await setPageUnpublished(tenantId, pt.data, userId);
  revalidatePath(`/admin/paginas/${pt.data}`);
  revalidatePath(`/p/${pt.data}`);
  return { success: true };
}

export async function archivePageAction(pageType: string) {
  const { tenantId, userId } = await requireLayoutEditor();
  const pt = PageTypeSchema.safeParse(pageType);
  if (!pt.success) return { error: "Tipo de página inválido" };
  await setPageArchived(tenantId, pt.data, userId);
  revalidatePath(`/admin/paginas/${pt.data}`);
  revalidatePath(`/p/${pt.data}`);
  return { success: true };
}

export async function unarchivePageAction(pageType: string) {
  const { tenantId, userId } = await requireLayoutEditor();
  const pt = PageTypeSchema.safeParse(pageType);
  if (!pt.success) return { error: "Tipo de página inválido" };
  await setPageUnarchived(tenantId, pt.data, userId);
  revalidatePath(`/admin/paginas/${pt.data}`);
  return { success: true };
}

// Helpers de leitura usados pelas páginas server-side do editor.
export async function loadEditor(pageType: string) {
  const { tenantId } = await requireLayoutEditor();
  const pt = PageTypeSchema.safeParse(pageType);
  if (!pt.success) return null;
  const [editor, versions, config] = await Promise.all([
    getEditorBlocks(tenantId, pt.data),
    listVersions(tenantId, pt.data),
    getPageConfig(tenantId, pt.data),
  ]);
  return {
    editor,
    versions,
    isLive: !!config?.liveAt,
    isArchived: !!config?.archivedAt,
  };
}
