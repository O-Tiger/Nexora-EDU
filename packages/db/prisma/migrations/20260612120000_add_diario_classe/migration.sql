-- CreateEnum
CREATE TYPE "PresencaStatus" AS ENUM ('PRESENTE', 'AUSENTE', 'JUSTIFICADA');

-- CreateTable
CREATE TABLE "RegistroAula" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "disciplinaId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "quantidadeAulas" INTEGER NOT NULL DEFAULT 1,
    "conteudo" TEXT NOT NULL,
    "observacoes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroAula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresencaAluno" (
    "id" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "status" "PresencaStatus" NOT NULL DEFAULT 'PRESENTE',

    CONSTRAINT "PresencaAluno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistroAula_tenantId_turmaId_disciplinaId_data_idx" ON "RegistroAula"("tenantId", "turmaId", "disciplinaId", "data");
CREATE UNIQUE INDEX "PresencaAluno_registroId_enrollmentId_key" ON "PresencaAluno"("registroId", "enrollmentId");
CREATE INDEX "PresencaAluno_enrollmentId_idx" ON "PresencaAluno"("enrollmentId");

-- AddForeignKey
ALTER TABLE "RegistroAula" ADD CONSTRAINT "RegistroAula_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegistroAula" ADD CONSTRAINT "RegistroAula_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PresencaAluno" ADD CONSTRAINT "PresencaAluno_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "RegistroAula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PresencaAluno" ADD CONSTRAINT "PresencaAluno_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TurmaEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
