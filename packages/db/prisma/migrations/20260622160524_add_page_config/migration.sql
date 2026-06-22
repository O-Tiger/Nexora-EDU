-- CreateTable
CREATE TABLE "PageConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "liveAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageConfig_tenantId_pageType_idx" ON "PageConfig"("tenantId", "pageType");

-- CreateIndex
CREATE UNIQUE INDEX "PageConfig_tenantId_pageType_key" ON "PageConfig"("tenantId", "pageType");
