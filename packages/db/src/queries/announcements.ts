import { prisma } from "../client";
import type { AnnouncementScope } from "@prisma/client";

export async function getAnnouncements(
  tenantId: string,
  opts: { courseId?: string; limit?: number } = {},
) {
  const limit = Math.min(opts.limit ?? 20, 100);
  return prisma.announcement.findMany({
    where: {
      tenantId,
      OR: [
        { scope: "PLATFORM" },
        ...(opts.courseId ? [{ scope: "COURSE" as AnnouncementScope, courseId: opts.courseId }] : []),
      ],
    },
    include: { author: { select: { name: true } } },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

export async function getAnnouncementById(tenantId: string, id: string) {
  return prisma.announcement.findFirst({
    where: { id, tenantId },
    include: { author: { select: { name: true } } },
  });
}

export async function createAnnouncement(
  tenantId: string,
  authorId: string,
  data: {
    title: string;
    body: string;
    scope: AnnouncementScope;
    courseId?: string | undefined;
    pinned?: boolean | undefined;
  },
) {
  return prisma.announcement.create({
    data: {
      tenantId,
      authorId,
      title: data.title,
      body: data.body,
      scope: data.scope,
      ...(data.courseId !== undefined && { courseId: data.courseId }),
      ...(data.pinned !== undefined && { pinned: data.pinned }),
    },
  });
}

export async function updateAnnouncement(
  tenantId: string,
  id: string,
  data: { title?: string | undefined; body?: string | undefined; pinned?: boolean | undefined },
) {
  return prisma.announcement.update({
    where: { id, tenantId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.body !== undefined && { body: data.body }),
      ...(data.pinned !== undefined && { pinned: data.pinned }),
    },
  });
}

export async function deleteAnnouncement(tenantId: string, id: string) {
  return prisma.announcement.delete({ where: { id, tenantId } });
}
