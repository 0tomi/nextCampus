-- Rename descripcionHtml to descripcion in Evento and Apunte
ALTER TABLE "Evento" RENAME COLUMN "descripcionHtml" TO "descripcion";
ALTER TABLE "Apunte" RENAME COLUMN "descripcionHtml" TO "descripcion";
