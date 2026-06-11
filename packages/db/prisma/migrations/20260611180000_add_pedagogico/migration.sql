-- CreateEnum
CREATE TYPE "GradeKind" AS ENUM ('AVA', 'RECP', 'FINAL');

-- CreateTable
CREATE TABLE "Disciplina" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Disciplina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurmaDisciplina" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "disciplinaId" TEXT NOT NULL,

    CONSTRAINT "TurmaDisciplina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "disciplinaId" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "kind" "GradeKind" NOT NULL,
    "score" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "disciplinaId" TEXT NOT NULL,
    "absences" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Disciplina_tenantId_parentId_idx" ON "Disciplina"("tenantId", "parentId");
CREATE INDEX "Disciplina_tenantId_active_idx" ON "Disciplina"("tenantId", "active");

CREATE INDEX "TurmaDisciplina_tenantId_turmaId_idx" ON "TurmaDisciplina"("tenantId", "turmaId");
CREATE UNIQUE INDEX "TurmaDisciplina_turmaId_disciplinaId_key" ON "TurmaDisciplina"("turmaId", "disciplinaId");

CREATE INDEX "Grade_tenantId_enrollmentId_idx" ON "Grade"("tenantId", "enrollmentId");
CREATE INDEX "Grade_disciplinaId_idx" ON "Grade"("disciplinaId");
CREATE UNIQUE INDEX "Grade_enrollmentId_disciplinaId_period_kind_key" ON "Grade"("enrollmentId", "disciplinaId", "period", "kind");

CREATE INDEX "Attendance_tenantId_enrollmentId_idx" ON "Attendance"("tenantId", "enrollmentId");
CREATE UNIQUE INDEX "Attendance_enrollmentId_disciplinaId_key" ON "Attendance"("enrollmentId", "disciplinaId");

-- AddForeignKey
ALTER TABLE "Disciplina" ADD CONSTRAINT "Disciplina_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TurmaDisciplina" ADD CONSTRAINT "TurmaDisciplina_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TurmaDisciplina" ADD CONSTRAINT "TurmaDisciplina_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Grade" ADD CONSTRAINT "Grade_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TurmaEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TurmaEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;
