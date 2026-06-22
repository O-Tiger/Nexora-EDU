import { prisma } from "@nexora/db";

export type TourId = "admin" | "professor" | "aluno" | "responsavel";

export async function getOnboardingStatus(userId: string, tourId: TourId) {
  const record = await prisma.userOnboarding.findUnique({
    where: { userId_tourId: { userId, tourId } },
    select: { completed: true, skipped: true },
  });
  return record ?? { completed: false, skipped: false };
}
