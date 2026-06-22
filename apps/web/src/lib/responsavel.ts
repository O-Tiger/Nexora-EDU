import { prisma } from "@nexora/db";

export type FilhoComTurma = {
  guardianId: string;
  guardianName: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  turmaId: string | null;
  turmaCode: string | null;
  anoLetivoId: string | null;
  anoLetivoYear: number | null;
};

/**
 * Retorna os filhos vinculados ao responsável logado (via Guardian.userId).
 * Um responsável pode ter mais de um filho.
 */
export async function getFilhosFromSession(responsavelUserId: string, tenantId: string): Promise<FilhoComTurma[]> {
  const guardians = await prisma.guardian.findMany({
    where: { userId: responsavelUserId, tenantId },
  });

  if (guardians.length === 0) return [];

  const results: FilhoComTurma[] = [];

  for (const guardian of guardians) {
    const student = await prisma.user.findUnique({
      where: { id: guardian.studentId },
      select: { id: true, name: true, email: true },
    });
    if (!student) continue;

    const enrollmentAtivo = await prisma.turmaEnrollment.findFirst({
      where: { tenantId, studentId: guardian.studentId, status: "ATIVA" },
      orderBy: { enrolledAt: "desc" },
    });

    const [turma, anoLetivo] = enrollmentAtivo
      ? await Promise.all([
          prisma.turma.findUnique({ where: { id: enrollmentAtivo.turmaId }, select: { code: true } }),
          prisma.anoLetivo.findUnique({ where: { id: enrollmentAtivo.anoLetivoId }, select: { year: true } }),
        ])
      : [null, null];

    results.push({
      guardianId: guardian.id,
      guardianName: guardian.name,
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      turmaId: enrollmentAtivo?.turmaId ?? null,
      turmaCode: turma?.code ?? null,
      anoLetivoId: enrollmentAtivo?.anoLetivoId ?? null,
      anoLetivoYear: anoLetivo?.year ?? null,
    });
  }

  return results;
}
