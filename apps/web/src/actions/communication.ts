"use server";

import { auth } from "@nexora/auth";
import { prisma } from "@nexora/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@nexora/db/src/queries/announcements";
import {
  createThread,
  createReply,
  lockThread,
  pinThread,
  deleteThread,
  deleteReply,
} from "@nexora/db/src/queries/forum";
import { sendMessage } from "@nexora/db/src/queries/messages";
import {
  createKnowledgeEntry,
  updateKnowledgeEntry,
  deleteKnowledgeEntry,
} from "@nexora/db/src/queries/knowledge";
import { createAuditLog } from "@nexora/db/src/queries/audit";
import {
  CreateAnnouncementSchema,
  UpdateAnnouncementSchema,
  CreateThreadSchema,
  CreateReplySchema,
  SendDirectMessageSchema,
  KnowledgeEntrySchema,
} from "@nexora/validators";
import type { AnnouncementScope } from "@nexora/db";

// ─── Guards ──────────────────────────────────────────────────────────────────

async function requireStaff() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId, id } = session.user;
  if (!["ADMIN", "SUPER_ADMIN", "COORDENADOR", "PROFESSOR"].includes(role)) redirect("/unauthorized");
  return { tenantId: activeTenantId, userId: id, role };
}

async function requireAdmin() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, activeTenantId, id } = session.user;
  if (!["ADMIN", "SUPER_ADMIN", "COORDENADOR"].includes(role)) redirect("/unauthorized");
  return { tenantId: activeTenantId, userId: id, role };
}

async function requireSession() {
  const session = await auth();
  if (!session) redirect("/login");
  return { tenantId: session.user.activeTenantId, userId: session.user.id, role: session.user.role };
}

// ─── Avisos ──────────────────────────────────────────────────────────────────

export async function createAnnouncementAction(data: unknown) {
  const { tenantId, userId } = await requireStaff();
  const parsed = CreateAnnouncementSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const a = await createAnnouncement(tenantId, userId, {
    title: parsed.data.title,
    body: parsed.data.body,
    scope: parsed.data.scope as AnnouncementScope,
    ...(parsed.data.courseId !== undefined && { courseId: parsed.data.courseId }),
    ...(parsed.data.pinned !== undefined && { pinned: parsed.data.pinned }),
  });

  await createAuditLog(tenantId, userId, "announcement.create", `announcement:${a.id}`);
  revalidatePath("/admin/comunicacao");
  revalidatePath("/aluno/comunicacao");
  return { announcementId: a.id };
}

export async function updateAnnouncementAction(id: string, data: unknown) {
  const { tenantId } = await requireStaff();
  const parsed = UpdateAnnouncementSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  await updateAnnouncement(tenantId, id, {
    ...(parsed.data.title !== undefined && { title: parsed.data.title }),
    ...(parsed.data.body !== undefined && { body: parsed.data.body }),
    ...(parsed.data.pinned !== undefined && { pinned: parsed.data.pinned }),
  });

  revalidatePath("/admin/comunicacao");
  revalidatePath("/aluno/comunicacao");
  return { success: true };
}

export async function deleteAnnouncementAction(id: string) {
  const { tenantId, userId } = await requireStaff();
  await deleteAnnouncement(tenantId, id);
  await createAuditLog(tenantId, userId, "announcement.delete", `announcement:${id}`);
  revalidatePath("/admin/comunicacao");
  revalidatePath("/aluno/comunicacao");
}

// ─── Fórum ───────────────────────────────────────────────────────────────────

export async function createThreadAction(data: unknown) {
  const { tenantId, userId } = await requireSession();
  const parsed = CreateThreadSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  // Verificar que o módulo pertence ao tenant e que o usuário tem acesso ao curso
  const mod = await prisma.module.findFirst({
    where: { id: parsed.data.moduleId, course: { tenantId } },
    include: { course: { include: { enrollments: { where: { userId, status: "ACTIVE" } } } } },
  });
  if (!mod) return { error: "Módulo não encontrado" };

  const { role } = await requireSession();
  const isStaff = ["ADMIN", "SUPER_ADMIN", "COORDENADOR", "PROFESSOR"].includes(role);
  const hasAccess = isStaff || mod.course.enrollments.length > 0;
  if (!hasAccess) return { error: "Sem acesso a este módulo" };

  const thread = await createThread(tenantId, userId, parsed.data);
  revalidatePath(`/aluno/cursos`);
  return { threadId: thread.id };
}

export async function createReplyAction(data: unknown) {
  const { tenantId, userId } = await requireSession();
  const parsed = CreateReplySchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  // Verificar que o thread pertence ao tenant
  const thread = await prisma.forumThread.findFirst({
    where: { id: parsed.data.threadId, tenantId },
    select: { locked: true },
  });
  if (!thread) return { error: "Tópico não encontrado" };
  if (thread.locked) return { error: "Este tópico está bloqueado" };

  const reply = await createReply(tenantId, userId, {
    threadId: parsed.data.threadId,
    body: parsed.data.body,
    ...(parsed.data.parentId !== undefined && { parentId: parsed.data.parentId }),
  });
  revalidatePath(`/aluno/forum`);
  return { replyId: reply.id };
}

export async function lockThreadAction(id: string, locked: boolean) {
  const { tenantId } = await requireStaff();
  await lockThread(tenantId, id, locked);
  revalidatePath("/admin/comunicacao");
}

export async function pinThreadAction(id: string, pinned: boolean) {
  const { tenantId } = await requireStaff();
  await pinThread(tenantId, id, pinned);
  revalidatePath("/admin/comunicacao");
}

export async function deleteThreadAction(id: string) {
  const { tenantId, userId } = await requireSession();
  const thread = await prisma.forumThread.findFirst({
    where: { id, tenantId },
    select: { authorId: true },
  });
  if (!thread) return { error: "Tópico não encontrado" };
  // Dono do tópico ou staff pode deletar
  const { role } = await requireSession();
  const isStaff = ["ADMIN", "SUPER_ADMIN", "COORDENADOR", "PROFESSOR"].includes(role);
  if (thread.authorId !== userId && !isStaff) return { error: "Sem permissão" };

  await deleteThread(tenantId, id);
  revalidatePath("/aluno/forum");
}

export async function deleteReplyAction(id: string) {
  const { tenantId, userId } = await requireSession();
  const reply = await prisma.forumReply.findFirst({
    where: { id, tenantId },
    select: { authorId: true },
  });
  if (!reply) return { error: "Resposta não encontrada" };
  const { role } = await requireSession();
  const isStaff = ["ADMIN", "SUPER_ADMIN", "COORDENADOR", "PROFESSOR"].includes(role);
  if (reply.authorId !== userId && !isStaff) return { error: "Sem permissão" };

  await deleteReply(tenantId, id);
  revalidatePath("/aluno/forum");
}

// ─── Mensagens diretas ────────────────────────────────────────────────────────

export async function sendMessageAction(data: unknown) {
  const { tenantId, userId } = await requireSession();
  const parsed = SendDirectMessageSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  // Anti-IDOR: receptor deve pertencer ao mesmo tenant
  const receiver = await prisma.tenantMembership.findFirst({
    where: { userId: parsed.data.receiverId, tenantId, active: true },
  });
  if (!receiver) return { error: "Destinatário não encontrado" };

  const msg = await sendMessage(tenantId, userId, {
    receiverId: parsed.data.receiverId,
    body: parsed.data.body,
    ...(parsed.data.threadId !== undefined && { threadId: parsed.data.threadId }),
  });

  revalidatePath("/aluno/mensagens");
  revalidatePath("/admin/comunicacao");
  return { messageId: msg.id, threadId: msg.threadId };
}

// ─── Base de conhecimento ─────────────────────────────────────────────────────

export async function createKnowledgeAction(data: unknown) {
  const { tenantId } = await requireAdmin();
  const parsed = KnowledgeEntrySchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const entry = await createKnowledgeEntry(tenantId, {
    question: parsed.data.question,
    answer: parsed.data.answer,
    ...(parsed.data.active !== undefined && { active: parsed.data.active }),
  });
  revalidatePath("/admin/comunicacao/base-conhecimento");
  return { entryId: entry.id };
}

export async function updateKnowledgeAction(id: string, data: unknown) {
  const { tenantId } = await requireAdmin();
  const parsed = KnowledgeEntrySchema.partial().safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  await updateKnowledgeEntry(tenantId, id, {
    ...(parsed.data.question !== undefined && { question: parsed.data.question }),
    ...(parsed.data.answer !== undefined && { answer: parsed.data.answer }),
    ...(parsed.data.active !== undefined && { active: parsed.data.active }),
  });
  revalidatePath("/admin/comunicacao/base-conhecimento");
  return { success: true };
}

export async function deleteKnowledgeAction(id: string) {
  const { tenantId } = await requireAdmin();
  await deleteKnowledgeEntry(tenantId, id);
  revalidatePath("/admin/comunicacao/base-conhecimento");
}
