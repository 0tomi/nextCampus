ALTER TYPE "RecursoTipo" ADD VALUE 'HTML';

ALTER TABLE "ApunteRecurso"
  ALTER COLUMN "url" SET DEFAULT '',
  ADD COLUMN "storageKey" TEXT,
  ADD COLUMN "mimeType" TEXT,
  ADD COLUMN "sizeBytes" INTEGER;
