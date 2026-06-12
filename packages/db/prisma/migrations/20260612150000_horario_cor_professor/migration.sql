-- Disciplina: cor para a grade de horários
ALTER TABLE "Disciplina" ADD COLUMN "color" TEXT;

-- TurmaDisciplina: professor responsável pela disciplina na turma
ALTER TABLE "TurmaDisciplina" ADD COLUMN "professorId" TEXT;

-- Turma: configuração do horário (slots de tempo + sábado)
ALTER TABLE "Turma" ADD COLUMN "horarioConfig" JSONB;

-- AddForeignKey
ALTER TABLE "TurmaDisciplina" ADD CONSTRAINT "TurmaDisciplina_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
