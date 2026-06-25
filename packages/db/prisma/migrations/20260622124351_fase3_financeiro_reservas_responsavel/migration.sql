-- CreateEnum
CREATE TYPE "MensalidadeStatus" AS ENUM ('PENDENTE', 'PAGA', 'VENCIDA', 'CANCELADA', 'ISENTA');

-- CreateEnum
CREATE TYPE "MensalidadeTipo" AS ENUM ('MENSALIDADE', 'TAXA_RESERVA');

-- CreateEnum
CREATE TYPE "ReservaStatus" AS ENUM ('PENDENTE', 'PAGA', 'CONFIRMADA', 'CANCELADA');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'RESPONSAVEL';

-- AlterTable
ALTER TABLE "Turma" ADD COLUMN     "etapaPrefix" TEXT;

-- CreateTable
CREATE TABLE "PlanoCobranca" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "anoLetivoId" TEXT NOT NULL,
    "turmaId" TEXT,
    "nome" TEXT NOT NULL,
    "valorCents" INTEGER NOT NULL,
    "vencimentoDia" INTEGER NOT NULL,
    "meses" INTEGER[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanoCobranca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensalidade" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "anoLetivoId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "valorCents" INTEGER NOT NULL,
    "descontoCents" INTEGER NOT NULL DEFAULT 0,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" "MensalidadeStatus" NOT NULL DEFAULT 'PENDENTE',
    "tipo" "MensalidadeTipo" NOT NULL DEFAULT 'MENSALIDADE',
    "omieClientId" TEXT,
    "omieReceivableId" TEXT,
    "omieSyncStatus" "OmieSyncStatus" NOT NULL DEFAULT 'PENDING',
    "omieError" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mensalidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservaVaga" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "anoLetivoAtualId" TEXT NOT NULL,
    "turmaAtualId" TEXT NOT NULL,
    "turmaProximaId" TEXT NOT NULL,
    "status" "ReservaStatus" NOT NULL DEFAULT 'PENDENTE',
    "mensalidadeId" TEXT,
    "entrevistaAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservaVaga_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanoCobranca_tenantId_anoLetivoId_idx" ON "PlanoCobranca"("tenantId", "anoLetivoId");

-- CreateIndex
CREATE INDEX "PlanoCobranca_tenantId_ativo_idx" ON "PlanoCobranca"("tenantId", "ativo");

-- CreateIndex
CREATE INDEX "Mensalidade_tenantId_anoLetivoId_idx" ON "Mensalidade"("tenantId", "anoLetivoId");

-- CreateIndex
CREATE INDEX "Mensalidade_tenantId_status_idx" ON "Mensalidade"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Mensalidade_studentId_idx" ON "Mensalidade"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Mensalidade_studentId_planoId_mes_ano_key" ON "Mensalidade"("studentId", "planoId", "mes", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "ReservaVaga_mensalidadeId_key" ON "ReservaVaga"("mensalidadeId");

-- CreateIndex
CREATE INDEX "ReservaVaga_tenantId_anoLetivoAtualId_idx" ON "ReservaVaga"("tenantId", "anoLetivoAtualId");

-- CreateIndex
CREATE INDEX "ReservaVaga_tenantId_status_idx" ON "ReservaVaga"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReservaVaga_studentId_anoLetivoAtualId_key" ON "ReservaVaga"("studentId", "anoLetivoAtualId");

-- AddForeignKey
ALTER TABLE "PlanoCobranca" ADD CONSTRAINT "PlanoCobranca_anoLetivoId_fkey" FOREIGN KEY ("anoLetivoId") REFERENCES "AnoLetivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoCobranca" ADD CONSTRAINT "PlanoCobranca_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensalidade" ADD CONSTRAINT "Mensalidade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensalidade" ADD CONSTRAINT "Mensalidade_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "PlanoCobranca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensalidade" ADD CONSTRAINT "Mensalidade_anoLetivoId_fkey" FOREIGN KEY ("anoLetivoId") REFERENCES "AnoLetivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservaVaga" ADD CONSTRAINT "ReservaVaga_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservaVaga" ADD CONSTRAINT "ReservaVaga_turmaAtualId_fkey" FOREIGN KEY ("turmaAtualId") REFERENCES "Turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservaVaga" ADD CONSTRAINT "ReservaVaga_turmaProximaId_fkey" FOREIGN KEY ("turmaProximaId") REFERENCES "Turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
