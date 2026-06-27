-- Índice parcial para el historial personal de Ranked.
-- La consulta de progreso filtra por subjectId + bankId + normalizedName sobre
-- intentos válidos terminados y los ordena por fecha. Sin este índice, el plan
-- recorre todos los intentos válidos del banco antes de filtrar por persona.
-- Es un índice parcial (cláusula WHERE) que Prisma no puede modelar en el
-- schema, igual que las policies de RLS y los triggers del proyecto: vive como
-- SQL crudo dentro de esta migración para quedar versionado y recrearse solo.
CREATE INDEX IF NOT EXISTS "RankedQuizAttempt_history_idx"
ON "RankedQuizAttempt" (
  "subjectId",
  "bankId",
  "normalizedName",
  "finishedAt" DESC
)
WHERE "status" = 'VALID' AND "finishedAt" IS NOT NULL;
