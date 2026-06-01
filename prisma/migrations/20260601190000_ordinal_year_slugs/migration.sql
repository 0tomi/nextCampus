-- Migración: renombrar slugs de años de anio-N → ordinales (primero, segundo, etc.)
-- Esto afecta AcademicYear.slug y AuditLog.yearSlug

-- 1) Renombrar slugs de años académicos
UPDATE "AcademicYear"
SET "slug" = CASE "orden"
  WHEN 1 THEN 'primero'
  WHEN 2 THEN 'segundo'
  WHEN 3 THEN 'tercero'
  WHEN 4 THEN 'cuarto'
  WHEN 5 THEN 'quinto'
  WHEN 6 THEN 'sexto'
  WHEN 7 THEN 'septimo'
  WHEN 8 THEN 'octavo'
  WHEN 9 THEN 'noveno'
  WHEN 10 THEN 'decimo'
END
WHERE "slug" LIKE 'anio-%'
  AND "orden" BETWEEN 1 AND 10;

-- 2) Actualizar referencias en AuditLog
UPDATE "audit_logs"
SET "yearSlug" = CASE "yearSlug"
  WHEN 'anio-1' THEN 'primero'
  WHEN 'anio-2' THEN 'segundo'
  WHEN 'anio-3' THEN 'tercero'
  WHEN 'anio-4' THEN 'cuarto'
  WHEN 'anio-5' THEN 'quinto'
END
WHERE "yearSlug" IN ('anio-1', 'anio-2', 'anio-3', 'anio-4', 'anio-5');

-- 3) Actualizar yearSlug dentro del JSON detail de AuditLog
UPDATE "audit_logs"
SET "detail" = jsonb_set(
  "detail"::jsonb,
  '{yearSlug}',
  to_jsonb(
    CASE "detail"::jsonb->>'yearSlug'
      WHEN 'anio-1' THEN 'primero'
      WHEN 'anio-2' THEN 'segundo'
      WHEN 'anio-3' THEN 'tercero'
      WHEN 'anio-4' THEN 'cuarto'
      WHEN 'anio-5' THEN 'quinto'
      ELSE "detail"::jsonb->>'yearSlug'
    END
  )
)
WHERE "detail"::jsonb ? 'yearSlug'
  AND "detail"::jsonb->>'yearSlug' IN ('anio-1', 'anio-2', 'anio-3', 'anio-4', 'anio-5');
