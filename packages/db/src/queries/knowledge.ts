import { prisma } from "../client";

export async function getKnowledgeEntries(tenantId: string, activeOnly = false) {
  return prisma.knowledgeEntry.findMany({
    where: { tenantId, ...(activeOnly && { active: true }) },
    orderBy: { createdAt: "desc" },
  });
}

export async function createKnowledgeEntry(
  tenantId: string,
  data: { question: string; answer: string; active?: boolean | undefined },
) {
  return prisma.knowledgeEntry.create({
    data: {
      tenantId,
      question: data.question,
      answer: data.answer,
      ...(data.active !== undefined && { active: data.active }),
    },
  });
}

export async function updateKnowledgeEntry(
  tenantId: string,
  id: string,
  data: { question?: string | undefined; answer?: string | undefined; active?: boolean | undefined },
) {
  return prisma.knowledgeEntry.update({
    where: { id, tenantId },
    data: {
      ...(data.question !== undefined && { question: data.question }),
      ...(data.answer !== undefined && { answer: data.answer }),
      ...(data.active !== undefined && { active: data.active }),
    },
  });
}

export async function deleteKnowledgeEntry(tenantId: string, id: string) {
  return prisma.knowledgeEntry.delete({ where: { id, tenantId } });
}
