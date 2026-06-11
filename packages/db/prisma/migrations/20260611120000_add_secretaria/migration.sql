-- CreateEnum
CREATE TYPE "UnidadeGender" AS ENUM ('MASCULINO', 'FEMININO', 'MISTO');

-- CreateEnum
CREATE TYPE "AnoLetivoStatus" AS ENUM ('PLANEJADO', 'EM_ANDAMENTO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "Etapa" AS ENUM ('EI', 'EF1', 'EF2', 'EM');

-- CreateEnum
CREATE TYPE "Periodo" AS ENUM ('MANHA', 'TARDE', 'NOITE', 'INTEGRAL');

-- CreateEnum
CREATE TYPE "TurmaEnrollmentStatus" AS ENUM ('ATIVA', 'TRANSFERIDA', 'CANCELADA', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "GuardianRelationship" AS ENUM ('PAI', 'MAE', 'RESPONSAVEL', 'OUTRO');

-- CreateTable
CREATE TABLE "Unidade" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "gender" "UnidadeGender" NOT NULL DEFAULT 'MISTO',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnoLetivo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "AnoLetivoStatus" NOT NULL DEFAULT 'PLANEJADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnoLetivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turma" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "anoLetivoId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "etapa" "Etapa" NOT NULL,
    "ano" INTEGER NOT NULL,
    "letra" TEXT NOT NULL,
    "periodo" "Periodo" NOT NULL DEFAULT 'MANHA',
    "maxStudents" INTEGER NOT NULL DEFAULT 35,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Turma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurmaEnrollment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "anoLetivoId" TEXT NOT NULL,
    "status" "TurmaEnrollmentStatus" NOT NULL DEFAULT 'ATIVA',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "TurmaEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guardian" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "cpf" TEXT,
    "relationship" "GuardianRelationship" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guardian_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Unidade_tenantId_code_key" ON "Unidade"("tenantId", "code");
CREATE INDEX "Unidade_tenantId_active_idx" ON "Unidade"("tenantId", "active");

CREATE UNIQUE INDEX "AnoLetivo_tenantId_year_key" ON "AnoLetivo"("tenantId", "year");
CREATE INDEX "AnoLetivo_tenantId_status_idx" ON "AnoLetivo"("tenantId", "status");

CREATE UNIQUE INDEX "Turma_tenantId_anoLetivoId_code_key" ON "Turma"("tenantId", "anoLetivoId", "code");
CREATE INDEX "Turma_tenantId_anoLetivoId_idx" ON "Turma"("tenantId", "anoLetivoId");
CREATE INDEX "Turma_unidadeId_etapa_idx" ON "Turma"("unidadeId", "etapa");

CREATE UNIQUE INDEX "TurmaEnrollment_studentId_anoLetivoId_key" ON "TurmaEnrollment"("studentId", "anoLetivoId");
CREATE INDEX "TurmaEnrollment_tenantId_turmaId_idx" ON "TurmaEnrollment"("tenantId", "turmaId");
CREATE INDEX "TurmaEnrollment_tenantId_anoLetivoId_idx" ON "TurmaEnrollment"("tenantId", "anoLetivoId");
CREATE INDEX "TurmaEnrollment_studentId_idx" ON "TurmaEnrollment"("studentId");

CREATE INDEX "Guardian_tenantId_studentId_idx" ON "Guardian"("tenantId", "studentId");
CREATE INDEX "Guardian_studentId_idx" ON "Guardian"("studentId");

-- AddForeignKey
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_anoLetivoId_fkey" FOREIGN KEY ("anoLetivoId") REFERENCES "AnoLetivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TurmaEnrollment" ADD CONSTRAINT "TurmaEnrollment_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TurmaEnrollment" ADD CONSTRAINT "TurmaEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
