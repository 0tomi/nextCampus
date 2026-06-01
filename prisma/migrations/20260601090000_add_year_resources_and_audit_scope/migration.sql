-- Recursos del año académico
ALTER TABLE "AcademicYear"
  ADD COLUMN "driveUrl" TEXT,
  ADD COLUMN "playlistUrl" TEXT,
  ADD COLUMN "playlistEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Alcance de año denormalizado para historial.
-- No hay FK: los logs deben seguir mostrando contexto aunque se borre el año.
ALTER TABLE "audit_logs"
  ADD COLUMN "yearId" TEXT,
  ADD COLUMN "yearSlug" TEXT;

CREATE INDEX "audit_logs_yearId_createdAt_id_idx" ON "audit_logs"("yearId", "createdAt", "id");
CREATE INDEX "audit_logs_yearSlug_idx" ON "audit_logs"("yearSlug");

-- Backfill best-effort por yearSlug ya guardado en detail.
UPDATE "audit_logs" al
SET
  "yearId" = ay."id",
  "yearSlug" = ay."slug"
FROM "AcademicYear" ay
WHERE al."yearId" IS NULL
  AND al."detail" ->> 'yearSlug' = ay."slug";

-- Backfill para logs de años: por entityId cuando el año aún existe.
UPDATE "audit_logs" al
SET
  "yearId" = ay."id",
  "yearSlug" = COALESCE(
    NULLIF(al."detail" ->> 'yearSlug', ''),
    NULLIF(al."detail" ->> 'slug', ''),
    NULLIF(al."detail" ->> 'newSlug', ''),
    ay."slug"
  )
FROM "AcademicYear" ay
WHERE al."yearId" IS NULL
  AND al."entityType" = 'year'
  AND al."entityId" = ay."id";

-- Backfill para logs de años borrados o renombrados sin fila actual.
UPDATE "audit_logs" al
SET
  "yearId" = COALESCE(al."yearId", al."entityId"),
  "yearSlug" = COALESCE(
    NULLIF(al."detail" ->> 'yearSlug', ''),
    NULLIF(al."detail" ->> 'slug', ''),
    NULLIF(al."detail" ->> 'newSlug', ''),
    al."yearSlug"
  )
WHERE al."entityType" = 'year'
  AND (
    al."yearId" IS NULL
    OR al."yearSlug" IS NULL
  );

-- Backfill por subjectSlug para logs antiguos que sólo guardaban materia.
UPDATE "audit_logs" al
SET
  "yearId" = ay."id",
  "yearSlug" = ay."slug"
FROM "Subject" s
JOIN "AcademicYear" ay ON ay."id" = s."yearId"
WHERE al."yearId" IS NULL
  AND al."detail" ->> 'subjectSlug' = s."slug";
