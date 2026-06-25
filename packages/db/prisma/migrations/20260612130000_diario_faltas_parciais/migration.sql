-- Presença parcial em aulas geminadas: troca status único por contagem de faltas
ALTER TABLE "PresencaAluno" DROP COLUMN "status";
ALTER TABLE "PresencaAluno" ADD COLUMN "faltas" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PresencaAluno" ADD COLUMN "justificadas" INTEGER NOT NULL DEFAULT 0;

-- Enum não é mais usado
DROP TYPE "PresencaStatus";
