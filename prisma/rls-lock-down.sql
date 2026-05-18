-- Defensa en profundidad: cierra el acceso lateral a las tablas de `public` vía
-- la Data API de Supabase (PostgREST + anon key pública expuesta en el browser).
-- Prisma se conecta con un rol privilegiado y bypassa RLS, por lo que el backend
-- no se ve afectado en absoluto.
--
-- Aplicar en: Supabase Dashboard → SQL Editor, o con `supabase db query`.
-- Verificar luego con una query de anon key que devuelva PGRST301 (no autorizado).

-- 1. Habilitar RLS en todas las tablas del schema public
ALTER TABLE "Career"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AcademicYear" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subject"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agenda"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TipoEvento"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Evento"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuizUnidad"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pregunta"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Apunte"      ENABLE ROW LEVEL SECURITY;

-- 2. Revocar acceso directo de los roles públicos.
--    Sin políticas RLS activas, ninguna fila es accesible vía Data API.
--    (REVOKE es redundante con RLS deny-all, pero es defensa adicional.)
REVOKE ALL ON TABLE "Career"      FROM anon, authenticated;
REVOKE ALL ON TABLE "AcademicYear" FROM anon, authenticated;
REVOKE ALL ON TABLE "Subject"     FROM anon, authenticated;
REVOKE ALL ON TABLE "Agenda"      FROM anon, authenticated;
REVOKE ALL ON TABLE "TipoEvento"  FROM anon, authenticated;
REVOKE ALL ON TABLE "Evento"      FROM anon, authenticated;
REVOKE ALL ON TABLE "QuizUnidad"  FROM anon, authenticated;
REVOKE ALL ON TABLE "Pregunta"    FROM anon, authenticated;
REVOKE ALL ON TABLE "Apunte"      FROM anon, authenticated;
