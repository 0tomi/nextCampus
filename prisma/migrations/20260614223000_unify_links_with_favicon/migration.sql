-- Links del año académico: de columnas fijas a una tabla dinámica (igual que SubjectLink).
-- El icono de cada botón pasa a resolverse del favicon de la URL, así que ya no
-- hace falta distinguir "tipo" de link.

-- CreateTable
CREATE TABLE "YearLink" (
    "id" TEXT NOT NULL,
    "yearId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "YearLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "YearLink_yearId_idx" ON "YearLink"("yearId");

-- AddForeignKey
ALTER TABLE "YearLink" ADD CONSTRAINT "YearLink_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: Drive del año
INSERT INTO "YearLink" ("id", "yearId", "label", "url", "orden", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'Drive del año', "driveUrl", 0, now(), now()
FROM "AcademicYear" WHERE "driveUrl" IS NOT NULL AND "driveUrl" <> '';

-- Backfill: Playlist del año
INSERT INTO "YearLink" ("id", "yearId", "label", "url", "orden", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'Playlist del año', "playlistUrl", 1, now(), now()
FROM "AcademicYear" WHERE "playlistUrl" IS NOT NULL AND "playlistUrl" <> '';

-- Backfill: Discord
INSERT INTO "YearLink" ("id", "yearId", "label", "url", "orden", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", COALESCE(NULLIF("discordDescripcion", ''), 'Discord'), "discordUrl", 2, now(), now()
FROM "AcademicYear" WHERE "discordUrl" IS NOT NULL AND "discordUrl" <> '';

-- Backfill: Discord alternativo
INSERT INTO "YearLink" ("id", "yearId", "label", "url", "orden", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", COALESCE(NULLIF("discordAltDescripcion", ''), 'Discord alternativo'), "discordAltUrl", 3, now(), now()
FROM "AcademicYear" WHERE "discordAltUrl" IS NOT NULL AND "discordAltUrl" <> '';

-- Drop columnas denormalizadas del año
ALTER TABLE "AcademicYear" DROP COLUMN "driveUrl",
DROP COLUMN "playlistUrl",
DROP COLUMN "playlistEnabled",
DROP COLUMN "discordUrl",
DROP COLUMN "discordDescripcion",
DROP COLUMN "discordAltUrl",
DROP COLUMN "discordAltDescripcion";

-- SubjectLink: el "tipo" queda obsoleto (el icono sale del favicon)
ALTER TABLE "SubjectLink" DROP COLUMN "tipo";

-- Enable Row Level Security (deny-all para anon/authenticated; Prisma conecta como postgres y la bypassea)
ALTER TABLE "YearLink" ENABLE ROW LEVEL SECURITY;
