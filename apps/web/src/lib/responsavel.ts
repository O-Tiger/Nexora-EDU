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

export function pickFilho(filhos: FilhoComTurma[], studentId?: string): FilhoComTurma | undefined {
  if (studentId) return filhos.find((f) => f.studentId === studentId) ?? filhos[0];
  return filhos[0];
}

/**
 * Retorna os filhos vinculados ao responsável logado (via Guardian.userId).
 * Um responsável pode ter mais de um filho.
 */
export async function getFilhosFromSession(responsavelUserId: string, tenantId: string): Promise<FilhoComTurma[]> {
  const guardians = await prisma.guardian.findMany({
    where: { userId: responsavelUserId, tenantId },
  });

  if (guardians.length === 0) return [];

  const studentIds = guardians.map((g) => g.studentId);

  const [students, enrollments] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, email: true },
    }),
    prisma.turmaEnrollment.findMany({
      where: { tenantId, studentId: { in: studentIds }, status: "ATIVA" },
      orderBy: { enrolledAt: "desc" },
      include: {
        turma: { select: { code: true, anoLetivo: { select: { year: true } } } },
      },
    }),
  ]);

  const studentMap = new Map(students.map((s) => [s.id, s]));
  // One active enrollment per student (the most recent one, ordered desc)
  const enrollmentMap = new Map<string, (typeof enrollments)[number]>();
  for (const e of enrollments) {
    if (!enrollmentMap.has(e.studentId)) enrollmentMap.set(e.studentId, e);
  }

  return guardians.flatMap((guardian) => {
    const student = studentMap.get(guardian.studentId);
    if (!student) return [];
    const enrollment = enrollmentMap.get(guardian.studentId);
    return [{
      guardianId: guardian.id,
      guardianName: guardian.name,
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      turmaId: enrollment?.turmaId ?? null,
      turmaCode: enrollment?.turma.code ?? null,
      anoLetivoId: enrollment?.anoLetivoId ?? null,
      anoLetivoYear: enrollment?.turma.anoLetivo.year ?? null,
    }];
  });
}
