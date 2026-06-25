-- CreateTable
CREATE TABLE "TenantConfig" (
    "tenantId" TEXT NOT NULL,
    "schoolName" TEXT,
    "schoolAddress" TEXT,
    "cnpj" TEXT,
    "emailDomain" TEXT,
    "emailTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantConfig_pkey" PRIMARY KEY ("tenantId")
);
