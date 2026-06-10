import { prisma } from "../client";

/** Lista todas as conversas (threads) de um usuário — resumo da última mensagem. */
export async function getMessageThreads(tenantId: string, userId: string) {
  const messages = await prisma.directMessage.findMany({
    where: {
      tenantId,
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    include: {
      sender:   { select: { id: true, name: true } },
      receiver: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Agrupa por threadId mantendo a mensagem mais recente de cada thread
  const threadMap = new Map<string, typeof messages[number]>();
  for (const m of messages) {
    if (!threadMap.has(m.threadId)) threadMap.set(m.threadId, m);
  }
  return [...threadMap.values()];
}

export async function getThread(tenantId: string, threadId: string, userId: string) {
  const messages = await prisma.directMessage.findMany({
    where: {
      tenantId,
      threadId,
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    include: {
      sender:   { select: { id: true, name: true } },
      receiver: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Marcar como lidas as mensagens recebidas não lidas
  const unreadIds = messages
    .filter((m) => m.receiverId === userId && m.readAt === null)
    .map((m) => m.id);
  if (unreadIds.length > 0) {
    await prisma.directMessage.updateMany({
      where: { id: { in: unreadIds } },
      data: { readAt: new Date() },
    });
  }

  return messages;
}

export async function sendMessage(
  tenantId: string,
  senderId: string,
  data: { receiverId: string; body: string; threadId?: string | undefined },
) {
  const threadId = data.threadId ?? `${[senderId, data.receiverId].sort().join("_")}_${Date.now()}`;
  return prisma.directMessage.create({
    data: {
      tenantId,
      threadId,
      senderId,
      receiverId: data.receiverId,
      body: data.body,
    },
  });
}

export async function countUnread(tenantId: string, userId: string) {
  return prisma.directMessage.count({
    where: { tenantId, receiverId: userId, readAt: null },
  });
}
