-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('PROVA', 'SIMULADO', 'OLIMPIADA', 'TRABALHO', 'REUNIAO', 'PASSEIO', 'FERIADO', 'OUTRO');

-- CreateTable
CREATE TABLE "HorarioAula" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "disciplinaId" TEXT NOT NULL,

    CONSTRAINT "HorarioAula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoCalendario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoCalendario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HorarioAula_tenantId_turmaId_idx" ON "HorarioAula"("tenantId", "turmaId");
CREATE UNIQUE INDEX "HorarioAula_turmaId_diaSemana_ordem_key" ON "HorarioAula"("turmaId", "diaSemana", "ordem");
CREATE INDEX "EventoCalendario_tenantId_turmaId_data_idx" ON "EventoCalendario"("tenantId", "turmaId", "data");

-- AddForeignKey
ALTER TABLE "HorarioAula" ADD CONSTRAINT "HorarioAula_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HorarioAula" ADD CONSTRAINT "HorarioAula_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventoCalendario" ADD CONSTRAINT "EventoCalendario_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
