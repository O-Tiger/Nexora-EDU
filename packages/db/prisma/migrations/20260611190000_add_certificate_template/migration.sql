-- CreateTable
CREATE TABLE "CertificateTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "subtitle" TEXT,
    "title" TEXT NOT NULL DEFAULT 'CERTIFICADO',
    "bodyTemplate" TEXT NOT NULL,
    "signatures" JSONB NOT NULL,
    "logoUrl" TEXT,
    "city" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#0D9488',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "CertificateTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CertificateTemplate_tenantId_key" ON "CertificateTemplate"("tenantId");
