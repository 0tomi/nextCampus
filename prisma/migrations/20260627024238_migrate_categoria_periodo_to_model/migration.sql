-- AlterTable: Convert column to TEXT to drop dependence on CategoriaPeriodo enum
ALTER TABLE "PeriodoAcademico" ALTER COLUMN "categoria" TYPE TEXT;

-- AlterTable: Rename column from categoria to categoriaId
ALTER TABLE "PeriodoAcademico" RENAME COLUMN "categoria" TO "categoriaId";

-- Drop old enum type now that no column references it
DROP TYPE "CategoriaPeriodo";

-- CreateTable
CREATE TABLE "CategoriaPeriodo" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoriaPeriodo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaPeriodo_label_key" ON "CategoriaPeriodo"("label");

-- Seed initial values to match existing values
INSERT INTO "CategoriaPeriodo" ("id", "label", "tone") VALUES
('SUSPENSION_CLASES', 'Suspensión de clases', 'sky'),
('MESAS_EXAMEN', 'Mesas de examen', 'yellow');

-- CreateIndex
CREATE INDEX "PeriodoAcademico_categoriaId_idx" ON "PeriodoAcademico"("categoriaId");

-- AddForeignKey
ALTER TABLE "PeriodoAcademico" ADD CONSTRAINT "PeriodoAcademico_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaPeriodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enable Row Level Security
ALTER TABLE "CategoriaPeriodo" ENABLE ROW LEVEL SECURITY;
