"use server";

import { auth } from "@nexora/auth";
import { prisma } from "@nexora/db";
import type { TourId } from "@/lib/onboarding";

export async function completeTourAction(tourId: TourId) {
  const session = await auth();
  if (!session) return;
  await prisma.userOnboarding.upsert({
    where: { userId_tourId: { userId: session.user.id, tourId } },
    create: { userId: session.user.id, tourId, completed: true, completedAt: new Date() },
    update: { completed: true, skipped: false, completedAt: new Date() },
  });
}

export async function skipTourAction(tourId: TourId) {
  const session = await auth();
  if (!session) return;
  await prisma.userOnboarding.upsert({
    where: { userId_tourId: { userId: session.user.id, tourId } },
    create: { userId: session.user.id, tourId, skipped: true },
    update: { skipped: true },
  });
}
