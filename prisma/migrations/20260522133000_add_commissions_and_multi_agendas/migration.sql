-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Agenda" ADD COLUMN "commissionId" TEXT;

-- Existing agendas remain as the general agenda for each subject.

-- DropIndex
DROP INDEX "Agenda_subjectId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Commission_subjectId_slug_key" ON "Commission"("subjectId", "slug");

-- CreateIndex
CREATE INDEX "Commission_subjectId_idx" ON "Commission"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Agenda_commissionId_key" ON "Agenda"("commissionId");

-- CreateIndex
CREATE INDEX "Agenda_subjectId_idx" ON "Agenda"("subjectId");

-- Prisma cannot express this partial uniqueness: one general agenda (commissionId NULL) per subject.
CREATE UNIQUE INDEX "Agenda_subjectId_general_key" ON "Agenda"("subjectId") WHERE "commissionId" IS NULL;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS for the new public table, matching the existing deny-by-default setup.
ALTER TABLE "Commission" ENABLE ROW LEVEL SECURITY;
