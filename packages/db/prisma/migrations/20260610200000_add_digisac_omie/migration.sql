-- AlterTable: add phone to User
ALTER TABLE "User" ADD COLUMN "phone" TEXT;

-- CreateEnum
CREATE TYPE "OmieSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- CreateTable: WhatsApp message templates per tenant/event
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Omie ERP sync state per enrollment
CREATE TABLE "OmieSync" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "omieClientId" TEXT,
    "omieReceivableId" TEXT,
    "status" "OmieSyncStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OmieSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_tenantId_event_key" ON "WhatsAppTemplate"("tenantId", "event");
CREATE INDEX "WhatsAppTemplate_tenantId_isActive_idx" ON "WhatsAppTemplate"("tenantId", "isActive");

CREATE UNIQUE INDEX "OmieSync_enrollmentId_key" ON "OmieSync"("enrollmentId");
CREATE INDEX "OmieSync_tenantId_status_idx" ON "OmieSync"("tenantId", "status");
CREATE INDEX "OmieSync_enrollmentId_idx" ON "OmieSync"("enrollmentId");
