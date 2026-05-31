-- Corrige el trigger de integridad de categorías para que no lea campos
-- inexistentes cuando corre sobre la tabla Apunte.
CREATE OR REPLACE FUNCTION ensure_apunte_has_categoria()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_apunte_id text;
BEGIN
  IF TG_TABLE_NAME = 'Apunte' THEN
    target_apunte_id := COALESCE(NEW."id", OLD."id");
  ELSE
    target_apunte_id := COALESCE(NEW."apunteId", OLD."apunteId");
  END IF;

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
