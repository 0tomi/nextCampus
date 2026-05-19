-- Quiz pasa a JSON-en-bucket (Supabase Storage). Se eliminan las tablas y el
-- enum del modelo viejo. Cambio irreversible: la data de quiz en DB se pierde.

-- DropForeignKey
ALTER TABLE "Pregunta" DROP CONSTRAINT "Pregunta_quizUnidadId_fkey";

-- DropForeignKey
ALTER TABLE "QuizUnidad" DROP CONSTRAINT "QuizUnidad_subjectId_fkey";

-- DropTable
DROP TABLE "Pregunta";

-- DropTable
DROP TABLE "QuizUnidad";

-- DropEnum
DROP TYPE "TipoPregunta";
