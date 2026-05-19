-- Habilita Row Level Security en todas las tablas del schema public.
-- Sin policies = deny-all para los roles anon y authenticated (PostgREST).
-- Prisma se conecta como rol postgres vía la pooler URL y BYPASS_RLS
-- por defecto, así que la app sigue funcionando igual.
ALTER TABLE "Career" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AcademicYear" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agenda" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Evento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TipoEvento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Apunte" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
