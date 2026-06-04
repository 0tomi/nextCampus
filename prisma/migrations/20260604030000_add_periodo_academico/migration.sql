-- Períodos académicos de la facultad (global, no cuelgan de ninguna materia).
-- Se renderizan pintando el fondo de los días del calendario.
CREATE TYPE "CategoriaPeriodo" AS ENUM ('SUSPENSION_CLASES', 'MESAS_EXAMEN');

CREATE TABLE "PeriodoAcademico" (
  "id" TEXT NOT NULL,
  "categoria" "CategoriaPeriodo" NOT NULL,
  "titulo" TEXT NOT NULL,
  "fechaInicio" DATE NOT NULL,
  "fechaFin" DATE NOT NULL,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PeriodoAcademico_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PeriodoAcademico"
  ADD CONSTRAINT "PeriodoAcademico_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "UserAccount"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PeriodoAcademico_fechaInicio_fechaFin_idx"
  ON "PeriodoAcademico"("fechaInicio", "fechaFin");

CREATE INDEX "PeriodoAcademico_createdByUserId_idx"
  ON "PeriodoAcademico"("createdByUserId");

ALTER TABLE "PeriodoAcademico" ENABLE ROW LEVEL SECURITY;
