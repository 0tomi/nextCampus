-- Categorías de apuntes y soporte para scroll infinito.
CREATE TABLE "Categoria" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApunteCategoria" (
  "apunteId" TEXT NOT NULL,
  "categoriaId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApunteCategoria_pkey" PRIMARY KEY ("apunteId", "categoriaId")
);

CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");
CREATE INDEX "ApunteCategoria_categoriaId_apunteId_idx" ON "ApunteCategoria"("categoriaId", "apunteId");

ALTER TABLE "ApunteCategoria"
  ADD CONSTRAINT "ApunteCategoria_apunteId_fkey"
  FOREIGN KEY ("apunteId") REFERENCES "Apunte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApunteCategoria"
  ADD CONSTRAINT "ApunteCategoria_categoriaId_fkey"
  FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Categoria" ("id", "nombre", "updatedAt")
VALUES
  ('categoria-otro', 'Otro', CURRENT_TIMESTAMP),
  ('categoria-documento', 'Documento', CURRENT_TIMESTAMP),
  ('categoria-herramienta', 'Herramienta', CURRENT_TIMESTAMP),
  ('categoria-cuestionario', 'Cuestionario', CURRENT_TIMESTAMP),
  ('categoria-video', 'Video', CURRENT_TIMESTAMP),
  ('categoria-imagenes', 'Imágenes', CURRENT_TIMESTAMP),
  ('categoria-pizarra', 'Pizarra', CURRENT_TIMESTAMP),
  ('categoria-interactivo', 'Interactivo', CURRENT_TIMESTAMP)
ON CONFLICT ("nombre") DO NOTHING;

INSERT INTO "ApunteCategoria" ("apunteId", "categoriaId")
SELECT a."id", c."id"
FROM "Apunte" a
CROSS JOIN "Categoria" c
WHERE c."nombre" = 'Otro'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION ensure_apunte_has_categoria()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_apunte_id text;
BEGIN
  target_apunte_id := COALESCE(NEW."apunteId", OLD."apunteId", NEW."id", OLD."id");

  IF target_apunte_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM "Apunte" a WHERE a."id" = target_apunte_id)
    AND NOT EXISTS (
      SELECT 1 FROM "ApunteCategoria" ac WHERE ac."apunteId" = target_apunte_id
    )
  THEN
    RAISE EXCEPTION 'Cada apunte debe tener al menos una categoría.';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "apunte_requires_categoria_on_apunte"
AFTER INSERT OR UPDATE ON "Apunte"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION ensure_apunte_has_categoria();

CREATE CONSTRAINT TRIGGER "apunte_requires_categoria_on_pivot"
AFTER DELETE OR UPDATE OF "apunteId", "categoriaId" ON "ApunteCategoria"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION ensure_apunte_has_categoria();

CREATE INDEX IF NOT EXISTS "Apunte_subjectId_createdAt_id_idx" ON "Apunte"("subjectId", "createdAt", "id");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_id_idx" ON "audit_logs"("createdAt", "id");
CREATE INDEX IF NOT EXISTS "audit_logs_userId_createdAt_id_idx" ON "audit_logs"("userId", "createdAt", "id");
CREATE INDEX IF NOT EXISTS "audit_logs_action_createdAt_id_idx" ON "audit_logs"("action", "createdAt", "id");

ALTER TABLE "Categoria" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApunteCategoria" ENABLE ROW LEVEL SECURITY;
