-- Prisma runs migrations in a transaction by default.
-- DROP INDEX CONCURRENTLY cannot run inside a transaction, so we use a regular DROP INDEX.
-- This is safe: the table is small and the operation is instantaneous in dev/staging.

DROP INDEX "HorarioAula_turmaId_diaSemana_ordem_key";
CREATE UNIQUE INDEX "HorarioAula_turmaId_diaSemana_ordem_frequencia_key"
  ON "HorarioAula"("turmaId", "diaSemana", "ordem", "frequencia");
