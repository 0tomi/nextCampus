-- Separar fecha y hora en Evento.
-- `fecha` pasa de timestamp (fecha+hora) a DATE puro; la hora vive aparte y es opcional.

-- 1. Columna hora opcional (nullable). Formato "HH:mm" 24h. null = evento sin hora.
ALTER TABLE "Evento" ADD COLUMN "hora" TEXT;

-- 2. Backfill: preservar la hora actual de TODOS los eventos existentes (incluido 00:00).
--    DEBE correr ANTES del cambio de tipo, que es lossy (descarta la parte horaria).
UPDATE "Evento" SET "hora" = to_char("fecha", 'HH24:MI');

-- 3. `fecha` pasa a DATE puro. La parte horaria ya quedó preservada en "hora".
ALTER TABLE "Evento" ALTER COLUMN "fecha" TYPE date USING "fecha"::date;
