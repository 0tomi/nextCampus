CREATE EXTENSION IF NOT EXISTS unaccent;

-- Slug en Apunte (nullable temporal para backfill)
ALTER TABLE "Apunte" ADD COLUMN "slug" TEXT;

-- Backfill con resolución de colisiones por subjectId
WITH base AS (
  SELECT id, "subjectId",
         NULLIF(
           trim(both '-' from
             regexp_replace(lower(unaccent(titulo)), '[^a-z0-9]+', '-', 'g')
           ),
           ''
         ) AS raw_slug
  FROM "Apunte"
),
prepared AS (
  SELECT id, "subjectId",
         LEFT(COALESCE(raw_slug, 'apunte'), 80) AS base_slug
  FROM base
),
numbered AS (
  SELECT id, "subjectId", base_slug,
         row_number() OVER (PARTITION BY "subjectId", base_slug ORDER BY id) AS rn
  FROM prepared
)
UPDATE "Apunte" a
SET slug = CASE WHEN n.rn = 1 THEN n.base_slug ELSE n.base_slug || '-' || n.rn END
FROM numbered n
WHERE a.id = n.id;

-- Locked: ya no debe quedar slug NULL
ALTER TABLE "Apunte" ALTER COLUMN "slug" SET NOT NULL;

-- Unique compuesto
CREATE UNIQUE INDEX "Apunte_subjectId_slug_key" ON "Apunte"("subjectId", "slug");

-- Nombre opcional en recurso
ALTER TABLE "ApunteRecurso" ADD COLUMN "nombre" TEXT;
