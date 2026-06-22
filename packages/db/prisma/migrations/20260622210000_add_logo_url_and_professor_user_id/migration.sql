-- Add logoUrl to TenantConfig
ALTER TABLE "TenantConfig" ADD COLUMN "logoUrl" TEXT;

-- Add userId to Professor (optional link to User for portal access)
ALTER TABLE "Professor" ADD COLUMN "userId" TEXT;
CREATE UNIQUE INDEX "Professor_userId_key" ON "Professor"("userId");
