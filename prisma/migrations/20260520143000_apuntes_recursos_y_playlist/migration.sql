-- AlterTable: Subject gana playlistUrl y playlistEnabled
ALTER TABLE "Subject" ADD COLUMN "playlistUrl" TEXT, ADD COLUMN "playlistEnabled" BOOLEAN NOT NULL DEFAULT false;

-- DropTable: Apunte (vacía — 0 filas verificado via MCP Supabase) + cascade a dependencias
DROP TABLE IF EXISTS "Apunte" CASCADE;

-- CreateEnum: RecursoTipo
CREATE TYPE "RecursoTipo" AS ENUM ('YOUTUBE', 'DRIVE');

-- CreateTable: Apunte (sin pdfObjectKey)
CREATE TABLE "Apunte" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcionHtml" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Apunte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Apunte.subjectId
CREATE INDEX "Apunte_subjectId_idx" ON "Apunte"("subjectId");

-- AddForeignKey: Apunte -> Subject
ALTER TABLE "Apunte" ADD CONSTRAINT "Apunte_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: ApunteRecurso
CREATE TABLE "ApunteRecurso" (
    "id" TEXT NOT NULL,
    "apunteId" TEXT NOT NULL,
    "tipo" "RecursoTipo" NOT NULL,
    "url" TEXT NOT NULL,
    "orden" SMALLINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApunteRecurso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: ApunteRecurso.apunteId
CREATE INDEX "ApunteRecurso_apunteId_idx" ON "ApunteRecurso"("apunteId");

-- CreateIndex: UNIQUE(apunteId, orden)
CREATE UNIQUE INDEX "ApunteRecurso_apunteId_orden_key" ON "ApunteRecurso"("apunteId", "orden");

-- AddForeignKey: ApunteRecurso -> Apunte
ALTER TABLE "ApunteRecurso" ADD CONSTRAINT "ApunteRecurso_apunteId_fkey" FOREIGN KEY ("apunteId") REFERENCES "Apunte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Habilitar RLS (mismo patrón que 20260519221627_enable_rls_on_public_tables)
ALTER TABLE "Apunte" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApunteRecurso" ENABLE ROW LEVEL SECURITY;
