-- AlterTable
ALTER TABLE "AcademicYear" ADD COLUMN     "color" TEXT;

-- CreateIndex
CREATE INDEX "Commission_subjectId_createdAt_id_idx" ON "Commission"("subjectId", "createdAt", "id");
