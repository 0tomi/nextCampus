-- Evita que una misma materia se repita dentro del mismo año académico.
-- La limpieza de filas duplicadas debe ejecutarse antes de aplicar este índice.
CREATE UNIQUE INDEX IF NOT EXISTS "Subject_yearId_nombre_key" ON "Subject"("yearId", "nombre");
