-- CreateEnum
CREATE TYPE "TipoAvaliacao" AS ENUM ('NOTA', 'SOMA', 'MEDIA', 'CONCEITO', 'SEM_INFLUENCIA');

-- CreateTable: AvaliacaoConfig
CREATE TABLE "AvaliacaoConfig" (
    "id"          TEXT NOT NULL,
    "tenantId"    TEXT NOT NULL,
    "sigla"       VARCHAR(20) NOT NULL,
    "label"       VARCHAR(100) NOT NULL,
    "periodo"     INTEGER NOT NULL,
    "isRecuperacao" BOOLEAN NOT NULL DEFAULT false,
    "tipo"        "TipoAvaliacao" NOT NULL,
    "peso"        DOUBLE PRECISION,
    "obrigatoria" BOOLEAN NOT NULL DEFAULT true,
    "ordem"       INTEGER NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvaliacaoConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AvaliacaoConfig_tenantId_sigla_key" ON "AvaliacaoConfig"("tenantId", "sigla");
CREATE INDEX "AvaliacaoConfig_tenantId_periodo_idx" ON "AvaliacaoConfig"("tenantId", "periodo");
CREATE INDEX "AvaliacaoConfig_tenantId_ordem_idx" ON "AvaliacaoConfig"("tenantId", "ordem");

-- Seed default AvaliacaoConfig for every existing tenant that has TenantConfig
-- Uses TenantConfig.periodos to determine how many AVA periods to create
INSERT INTO "AvaliacaoConfig" ("id", "tenantId", "sigla", "label", "periodo", "tipo", "obrigatoria", "ordem", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    tc."tenantId",
    'AV' || n,
    'Nota ' || n || 'º ' ||
        CASE WHEN tc.periodos = 2 THEN 'Semestre'
             WHEN tc.periodos = 4 THEN 'Bimestre'
             ELSE 'Trimestre' END,
    n,
    'NOTA',
    true,
    n,
    now(),
    now()
FROM "TenantConfig" tc
CROSS JOIN generate_series(1, COALESCE(tc.periodos, 3)) AS n
ON CONFLICT ("tenantId", "sigla") DO NOTHING;

-- Recuperação global
INSERT INTO "AvaliacaoConfig" ("id", "tenantId", "sigla", "label", "periodo", "isRecuperacao", "tipo", "obrigatoria", "ordem", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    tc."tenantId",
    'REC',
    'Recuperação',
    0,
    true,
    'NOTA',
    false,
    COALESCE(tc.periodos, 3) + 1,
    now(),
    now()
FROM "TenantConfig" tc
ON CONFLICT ("tenantId", "sigla") DO NOTHING;

-- Prova Final
INSERT INTO "AvaliacaoConfig" ("id", "tenantId", "sigla", "label", "periodo", "tipo", "obrigatoria", "ordem", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    tc."tenantId",
    'PF',
    'Prova Final',
    0,
    'NOTA',
    false,
    COALESCE(tc.periodos, 3) + 2,
    now(),
    now()
FROM "TenantConfig" tc
ON CONFLICT ("tenantId", "sigla") DO NOTHING;

-- Tenants sem TenantConfig: criar configs padrão trimestral
INSERT INTO "AvaliacaoConfig" ("id", "tenantId", "sigla", "label", "periodo", "tipo", "obrigatoria", "ordem", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    tm."tenantId",
    'AV' || n,
    'Nota ' || n || 'º Trimestre',
    n,
    'NOTA',
    true,
    n,
    now(),
    now()
FROM (SELECT DISTINCT "tenantId" FROM "TenantMembership") tm
CROSS JOIN generate_series(1, 3) AS n
WHERE tm."tenantId" NOT IN (SELECT "tenantId" FROM "TenantConfig")
ON CONFLICT ("tenantId", "sigla") DO NOTHING;

INSERT INTO "AvaliacaoConfig" ("id", "tenantId", "sigla", "label", "periodo", "isRecuperacao", "tipo", "obrigatoria", "ordem", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, tm."tenantId", 'REC', 'Recuperação', 0, true, 'NOTA', false, 4, now(), now()
FROM (SELECT DISTINCT "tenantId" FROM "TenantMembership") tm
WHERE tm."tenantId" NOT IN (SELECT "tenantId" FROM "TenantConfig")
ON CONFLICT ("tenantId", "sigla") DO NOTHING;

INSERT INTO "AvaliacaoConfig" ("id", "tenantId", "sigla", "label", "periodo", "tipo", "obrigatoria", "ordem", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, tm."tenantId", 'PF', 'Prova Final', 0, 'NOTA', false, 5, now(), now()
FROM (SELECT DISTINCT "tenantId" FROM "TenantMembership") tm
WHERE tm."tenantId" NOT IN (SELECT "tenantId" FROM "TenantConfig")
ON CONFLICT ("tenantId", "sigla") DO NOTHING;

-- ─── Migrate Grade table ─────────────────────────────────────────────────────

-- 1. Add new columns (nullable for backfill)
ALTER TABLE "Grade" ADD COLUMN "avaliacaoConfigId" TEXT;
ALTER TABLE "Grade" ADD COLUMN "conceito" VARCHAR(2);

-- 2. Backfill: map existing (period, kind) → AvaliacaoConfig.id
UPDATE "Grade" g
SET "avaliacaoConfigId" = ac."id"
FROM "AvaliacaoConfig" ac
WHERE ac."tenantId" = g."tenantId"
  AND ac."sigla" = CASE
    WHEN g."kind" = 'AVA'   THEN 'AV' || g."period"
    WHEN g."kind" = 'RECP'  AND g."period" = 0 THEN 'REC'
    WHEN g."kind" = 'RECP'  AND g."period" > 0 THEN 'REC'  -- map per-period recp to global REC
    WHEN g."kind" = 'FINAL' THEN 'PF'
    ELSE NULL
  END;

-- 3. Delete grades that couldn't be mapped (edge cases from old data)
DELETE FROM "Grade" WHERE "avaliacaoConfigId" IS NULL;

-- 4. Make avaliacaoConfigId NOT NULL and add FK
ALTER TABLE "Grade" ALTER COLUMN "avaliacaoConfigId" SET NOT NULL;

ALTER TABLE "Grade"
    ADD CONSTRAINT "Grade_avaliacaoConfigId_fkey"
    FOREIGN KEY ("avaliacaoConfigId") REFERENCES "AvaliacaoConfig"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Grade_avaliacaoConfigId_idx" ON "Grade"("avaliacaoConfigId");

-- 5. Drop old unique constraint and add new one
ALTER TABLE "Grade" DROP CONSTRAINT IF EXISTS "Grade_enrollmentId_disciplinaId_period_kind_key";
CREATE UNIQUE INDEX "Grade_enrollmentId_disciplinaId_avaliacaoConfigId_key"
    ON "Grade"("enrollmentId", "disciplinaId", "avaliacaoConfigId");
CREATE INDEX "Grade_tenantId_disciplinaId_idx" ON "Grade"("tenantId", "disciplinaId");

-- 6. Drop old columns
ALTER TABLE "Grade" DROP COLUMN "period";
ALTER TABLE "Grade" DROP COLUMN "kind";

-- 7. Drop old enum
DROP TYPE IF EXISTS "GradeKind";
