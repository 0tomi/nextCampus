-- Integración Apuntes↔Eventos, ranking de aportadores y nuevos rangos.

-- 1) Roles: ADMIN_GENERAL -> ADMIN, ADMIN_CAMPUS -> AYUDANTE, SUPERVISOR nuevo.
ALTER TYPE "UserRole" RENAME VALUE 'ADMIN_GENERAL' TO 'ADMIN';
ALTER TYPE "UserRole" RENAME VALUE 'ADMIN_CAMPUS' TO 'AYUDANTE';
ALTER TYPE "UserRole" ADD VALUE 'SUPERVISOR';

-- 2) Perfil visible e indicadores internos de contribución.
ALTER TABLE "UserAccount"
  ADD COLUMN "nombreUsuario" TEXT,
  ADD COLUMN "puntaje" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "eventosCreados" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "apuntesCreados" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "bancosPreguntasCreados" INTEGER NOT NULL DEFAULT 0;

UPDATE "UserAccount"
SET "nombreUsuario" = COALESCE(NULLIF(trim("email"), ''), "id")
WHERE "nombreUsuario" IS NULL;

ALTER TABLE "UserAccount" ALTER COLUMN "nombreUsuario" SET NOT NULL;

CREATE INDEX "UserAccount_puntaje_idx" ON "UserAccount"("puntaje");

-- 3) Autoría nullable para contenido administrativo.
ALTER TABLE "Evento" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "Apunte" ADD COLUMN "createdByUserId" TEXT;

ALTER TABLE "Evento"
  ADD CONSTRAINT "Evento_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "UserAccount"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Apunte"
  ADD CONSTRAINT "Apunte_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "UserAccount"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Evento_createdByUserId_idx" ON "Evento"("createdByUserId");
CREATE INDEX "Apunte_createdByUserId_idx" ON "Apunte"("createdByUserId");

-- Backfill de autoría desde auditoría, tomando la primera creación confiable por entidad.
WITH evento_authors AS (
  SELECT DISTINCT ON (al."entityId") al."entityId", al."userId"
  FROM "audit_logs" al
  JOIN "UserAccount" u ON u."id" = al."userId"
  WHERE al."action" = 'EVENTO_CREATED'
    AND al."entityId" IS NOT NULL
  ORDER BY al."entityId", al."createdAt" ASC, al."id" ASC
)
UPDATE "Evento" e
SET "createdByUserId" = ea."userId"
FROM evento_authors ea
WHERE e."id" = ea."entityId";

WITH apunte_authors AS (
  SELECT DISTINCT ON (al."entityId") al."entityId", al."userId"
  FROM "audit_logs" al
  JOIN "UserAccount" u ON u."id" = al."userId"
  WHERE al."action" = 'APUNTE_CREATED'
    AND al."entityId" IS NOT NULL
  ORDER BY al."entityId", al."createdAt" ASC, al."id" ASC
)
UPDATE "Apunte" a
SET "createdByUserId" = aa."userId"
FROM apunte_authors aa
WHERE a."id" = aa."entityId";

-- 4) Pivot Apunte↔Evento.
CREATE TABLE "ApunteEvento" (
  "apunteId" TEXT NOT NULL,
  "eventoId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApunteEvento_pkey" PRIMARY KEY ("apunteId", "eventoId")
);

CREATE INDEX "ApunteEvento_eventoId_idx" ON "ApunteEvento"("eventoId");
CREATE INDEX "ApunteEvento_apunteId_idx" ON "ApunteEvento"("apunteId");

ALTER TABLE "ApunteEvento"
  ADD CONSTRAINT "ApunteEvento_apunteId_fkey"
  FOREIGN KEY ("apunteId") REFERENCES "Apunte"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApunteEvento"
  ADD CONSTRAINT "ApunteEvento_eventoId_fkey"
  FOREIGN KEY ("eventoId") REFERENCES "Evento"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Un apunte relacionado debe pertenecer a la misma materia del evento.
CREATE OR REPLACE FUNCTION ensure_apunte_evento_same_subject()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  apunte_subject_id text;
  evento_subject_id text;
BEGIN
  SELECT a."subjectId" INTO apunte_subject_id
  FROM "Apunte" a
  WHERE a."id" = NEW."apunteId";

  SELECT ag."subjectId" INTO evento_subject_id
  FROM "Evento" e
  JOIN "Agenda" ag ON ag."id" = e."agendaId"
  WHERE e."id" = NEW."eventoId";

  IF apunte_subject_id IS NULL OR evento_subject_id IS NULL OR apunte_subject_id <> evento_subject_id THEN
    RAISE EXCEPTION 'El apunte relacionado debe pertenecer a la misma materia del evento.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "apunte_evento_same_subject"
AFTER INSERT OR UPDATE OF "apunteId", "eventoId" ON "ApunteEvento"
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION ensure_apunte_evento_same_subject();

ALTER TABLE "ApunteEvento" ENABLE ROW LEVEL SECURITY;

-- 5) Contadores históricos desde autoría auditada y auditoría disponible.
WITH evento_counts AS (
  SELECT "createdByUserId" AS "userId", COUNT(*)::int AS count
  FROM "Evento"
  WHERE "createdByUserId" IS NOT NULL
  GROUP BY "createdByUserId"
),
apunte_counts AS (
  SELECT "createdByUserId" AS "userId", COUNT(*)::int AS count
  FROM "Apunte"
  WHERE "createdByUserId" IS NOT NULL
  GROUP BY "createdByUserId"
),
apunte_resource_counts AS (
  SELECT al."userId", COALESCE(SUM(NULLIF(al."detail"->>'recursosCount', '')::int), 0)::int AS count
  FROM "audit_logs" al
  WHERE al."action" = 'APUNTE_CREATED'
    AND al."userId" IS NOT NULL
    AND al."detail" ? 'recursosCount'
    AND (al."detail"->>'recursosCount') ~ '^[0-9]+$'
  GROUP BY al."userId"
),
quiz_counts AS (
  SELECT al."userId", COUNT(*)::int AS count
  FROM "audit_logs" al
  WHERE al."action" = 'QUIZ_BANK_UPLOADED'
    AND al."userId" IS NOT NULL
  GROUP BY al."userId"
),
quiz_question_counts AS (
  SELECT al."userId", COALESCE(SUM(NULLIF(al."detail"->>'totalPreguntas', '')::int), 0)::int AS count
  FROM "audit_logs" al
  WHERE al."action" = 'QUIZ_BANK_UPLOADED'
    AND al."userId" IS NOT NULL
    AND al."detail" ? 'totalPreguntas'
    AND (al."detail"->>'totalPreguntas') ~ '^[0-9]+$'
  GROUP BY al."userId"
)
UPDATE "UserAccount" u
SET
  "eventosCreados" = COALESCE(ec.count, 0),
  "apuntesCreados" = COALESCE(ac.count, 0),
  "bancosPreguntasCreados" = COALESCE(qc.count, 0),
  "puntaje" = COALESCE(ec.count, 0)
    + COALESCE(ac.count, 0)
    + COALESCE(arc.count, 0)
    + COALESCE(qc.count, 0)
    + COALESCE(qqc.count, 0)
FROM "UserAccount" base
LEFT JOIN evento_counts ec ON ec."userId" = base."id"
LEFT JOIN apunte_counts ac ON ac."userId" = base."id"
LEFT JOIN apunte_resource_counts arc ON arc."userId" = base."id"
LEFT JOIN quiz_counts qc ON qc."userId" = base."id"
LEFT JOIN quiz_question_counts qqc ON qqc."userId" = base."id"
WHERE u."id" = base."id";
