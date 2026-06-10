import { prisma } from "../client";

export async function getThreadsByModule(tenantId: string, moduleId: string) {
  return prisma.forumThread.findMany({
    where: { tenantId, moduleId },
    include: {
      author: { select: { name: true } },
      _count: { select: { replies: true } },
    },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
}

export async function getThreadById(tenantId: string, id: string) {
  return prisma.forumThread.findFirst({
    where: { id, tenantId },
    include: {
      author: { select: { name: true } },
      replies: {
        where: { parentId: null },
        include: {
          author: { select: { name: true } },
          replies: {
            include: { author: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function createThread(
  tenantId: string,
  authorId: string,
  data: { moduleId: string; title: string; body: string },
) {
  return prisma.forumThread.create({
    data: { tenantId, authorId, ...data },
  });
}

export async function createReply(
  tenantId: string,
  authorId: string,
  data: { threadId: string; body: string; parentId?: string | undefined },
) {
  return prisma.$transaction(async (tx) => {
    const reply = await tx.forumReply.create({
      data: {
        tenantId,
        authorId,
        threadId: data.threadId,
        body: data.body,
        ...(data.parentId !== undefined && { parentId: data.parentId }),
      },
    });
    // Atualiza updatedAt do thread para re-ordenação
    await tx.forumThread.update({
      where: { id: data.threadId },
      data: { updatedAt: new Date() },
    });
    return reply;
  });
}

export async function lockThread(tenantId: string, id: string, locked: boolean) {
  return prisma.forumThread.update({ where: { id, tenantId }, data: { locked } });
}

export async function pinThread(tenantId: string, id: string, pinned: boolean) {
  return prisma.forumThread.update({ where: { id, tenantId }, data: { pinned } });
}

export async function deleteThread(tenantId: string, id: string) {
  return prisma.forumThread.delete({ where: { id, tenantId } });
}

export async function deleteReply(tenantId: string, id: string) {
  return prisma.forumReply.delete({ where: { id, tenantId } });
}
