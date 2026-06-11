-- AlterTable: LGPD consent and anonymization tracking on User
ALTER TABLE "User" ADD COLUMN "consentedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "anonymizedAt" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "DataExportStatus" AS ENUM ('PENDING', 'READY', 'EXPIRED');

-- CreateTable: LGPD personal data export requests
CREATE TABLE "UserDataExport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "DataExportStatus" NOT NULL DEFAULT 'PENDING',
    "r2Key" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDataExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserDataExport_userId_idx" ON "UserDataExport"("userId");
CREATE INDEX "UserDataExport_tenantId_status_idx" ON "UserDataExport"("tenantId", "status");
