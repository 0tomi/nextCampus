-- CreateTable
CREATE TABLE "SubjectLink" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SubjectLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubjectLink_subjectId_idx" ON "SubjectLink"("subjectId");

-- AddForeignKey
ALTER TABLE "SubjectLink" ADD CONSTRAINT "SubjectLink_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill drive links
INSERT INTO "SubjectLink" ("id", "subjectId", "tipo", "label", "url", "orden", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'drive', 'Drive con contenido de la materia', "driveUrl", 0, now(), now()
FROM "Subject" WHERE "driveUrl" IS NOT NULL AND "driveUrl" <> '';

-- Backfill playlist links
INSERT INTO "SubjectLink" ("id", "subjectId", "tipo", "label", "url", "orden", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'playlist', 'Playlist de clases', "playlistUrl", 1, now(), now()
FROM "Subject" WHERE "playlistUrl" IS NOT NULL AND "playlistUrl" <> '';

-- Drop old denormalized columns
ALTER TABLE "Subject" DROP COLUMN "driveUrl",
DROP COLUMN "playlistUrl",
DROP COLUMN "playlistEnabled";

-- Enable Row Level Security (deny-all for anon/authenticated; Prisma connects as postgres and bypasses)
ALTER TABLE "SubjectLink" ENABLE ROW LEVEL SECURITY;
