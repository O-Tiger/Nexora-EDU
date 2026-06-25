-- AlterTable
ALTER TABLE "Disciplina" ADD COLUMN     "isItinerario" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EnrollmentFrente" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "disciplinaId" TEXT NOT NULL,
    "frenteId" TEXT NOT NULL,

    CONSTRAINT "EnrollmentFrente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnrollmentFrente_tenantId_disciplinaId_idx" ON "EnrollmentFrente"("tenantId", "disciplinaId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentFrente_enrollmentId_disciplinaId_key" ON "EnrollmentFrente"("enrollmentId", "disciplinaId");

-- AddForeignKey
ALTER TABLE "EnrollmentFrente" ADD CONSTRAINT "EnrollmentFrente_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TurmaEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentFrente" ADD CONSTRAINT "EnrollmentFrente_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentFrente" ADD CONSTRAINT "EnrollmentFrente_frenteId_fkey" FOREIGN KEY ("frenteId") REFERENCES "Disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Professor" ADD CONSTRAINT "Professor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
