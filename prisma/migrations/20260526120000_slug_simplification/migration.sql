-- 1) Renombrar slugs de años: sistemas-uader-fcyt-anio-N → anio-N
UPDATE "AcademicYear"
SET "slug" = regexp_replace("slug", '^sistemas-uader-fcyt-', '')
WHERE "slug" LIKE 'sistemas-uader-fcyt-anio-%';

-- 2) Quitar el prefijo de año del slug de las materias que arrancan con el slug del año NUEVO
UPDATE "Subject" s
SET "slug" = regexp_replace(s."slug", '^' || y."slug" || '-', '')
FROM "AcademicYear" y
WHERE s."yearId" = y."id"
  AND s."slug" LIKE y."slug" || '-%';

-- 3) Cleanup de materias que aún arranquen con el prefijo viejo completo (por las dudas)
UPDATE "Subject"
SET "slug" = regexp_replace("slug", '^sistemas-uader-fcyt-anio-[0-9]+-', '')
WHERE "slug" LIKE 'sistemas-uader-fcyt-anio-%';
