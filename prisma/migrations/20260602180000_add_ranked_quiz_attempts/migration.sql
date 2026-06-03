-- Persistencia mínima para Examen Ranked: intentos, invalidación y ranking.
CREATE TYPE "RankedQuizAttemptStatus" AS ENUM ('IN_PROGRESS', 'VALID', 'INVALID');

CREATE TABLE "RankedQuizAttempt" (
  "id" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "bankId" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "participantName" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "questionIds" TEXT[] NOT NULL,
  "status" "RankedQuizAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "invalidReason" TEXT,
  "invalidatedAt" TIMESTAMP(3),
  "correctAnswers" INTEGER,
  "totalQuestions" INTEGER NOT NULL,
  "percentage" INTEGER,
  "durationSeconds" INTEGER,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RankedQuizAttempt_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RankedQuizAttempt"
  ADD CONSTRAINT "RankedQuizAttempt_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "RankedQuizAttempt_top_idx"
  ON "RankedQuizAttempt"("subjectId", "bankId", "status", "percentage", "durationSeconds", "finishedAt");

CREATE INDEX "RankedQuizAttempt_name_idx"
  ON "RankedQuizAttempt"("subjectId", "bankId", "normalizedName");

CREATE INDEX "RankedQuizAttempt_status_idx"
  ON "RankedQuizAttempt"("status", "finishedAt");

ALTER TABLE "RankedQuizAttempt" ENABLE ROW LEVEL SECURITY;
