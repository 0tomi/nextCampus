-- CreateEnum
CREATE TYPE "ChangelogAudience" AS ENUM ('PUBLIC', 'AYUDANTE', 'SUPERVISOR', 'ADMIN');

-- CreateTable
CREATE TABLE "ChangelogEntry" (
    "id" TEXT NOT NULL,
    "changelogId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "audience" "ChangelogAudience" NOT NULL DEFAULT 'PUBLIC',
    "visibleAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangelogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangelogRead" (
    "userId" TEXT NOT NULL,
    "changelogEntryId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangelogRead_pkey" PRIMARY KEY ("userId", "changelogEntryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChangelogEntry_changelogId_key" ON "ChangelogEntry"("changelogId");

-- CreateIndex
CREATE INDEX "ChangelogEntry_audience_visibleAt_id_idx" ON "ChangelogEntry"("audience", "visibleAt", "id");

-- CreateIndex
CREATE INDEX "ChangelogEntry_visibleAt_id_idx" ON "ChangelogEntry"("visibleAt", "id");

-- CreateIndex
CREATE INDEX "ChangelogRead_userId_readAt_idx" ON "ChangelogRead"("userId", "readAt");

-- CreateIndex
CREATE INDEX "ChangelogRead_changelogEntryId_idx" ON "ChangelogRead"("changelogEntryId");

-- AddForeignKey
ALTER TABLE "ChangelogRead" ADD CONSTRAINT "ChangelogRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogRead" ADD CONSTRAINT "ChangelogRead_changelogEntryId_fkey" FOREIGN KEY ("changelogEntryId") REFERENCES "ChangelogEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Mantiene el patrón de seguridad del proyecto: Prisma accede con conexión
-- privilegiada y PostgREST no expone filas sin políticas explícitas.
ALTER TABLE "ChangelogEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChangelogRead" ENABLE ROW LEVEL SECURITY;
