-- Professor passa a ser cadastro interno (sem login). Re-aponta o FK de User para Professor.

-- Remove o FK antigo (professorId -> User) e zera valores (eram ids de User)
ALTER TABLE "TurmaDisciplina" DROP CONSTRAINT "TurmaDisciplina_professorId_fkey";
UPDATE "TurmaDisciplina" SET "professorId" = NULL;

-- CreateTable
CREATE TABLE "Professor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Professor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Professor_tenantId_active_idx" ON "Professor"("tenantId", "active");

-- AddForeignKey (professorId -> Professor)
ALTER TABLE "TurmaDisciplina" ADD CONSTRAINT "TurmaDisciplina_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
