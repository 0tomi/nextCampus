ALTER TABLE "ChangelogEntry" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';

UPDATE "ChangelogEntry"
SET "description" = "summary"
WHERE "description" = '';

ALTER TABLE "ChangelogEntry" ALTER COLUMN "description" DROP DEFAULT;
