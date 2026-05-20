-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN_GENERAL', 'ADMIN_CAMPUS');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateTable
CREATE TABLE "UserAccount" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserYearPermission" (
    "userId" TEXT NOT NULL,
    "yearId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserYearPermission_pkey" PRIMARY KEY ("userId", "yearId")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_authUserId_key" ON "UserAccount"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_email_key" ON "UserAccount"("email");

-- CreateIndex
CREATE INDEX "UserAccount_role_idx" ON "UserAccount"("role");

-- CreateIndex
CREATE INDEX "UserAccount_status_idx" ON "UserAccount"("status");

-- CreateIndex
CREATE INDEX "UserYearPermission_yearId_idx" ON "UserYearPermission"("yearId");

-- AddForeignKey
ALTER TABLE "UserYearPermission" ADD CONSTRAINT "UserYearPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserYearPermission" ADD CONSTRAINT "UserYearPermission_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Mantiene el patrón de seguridad existente: la app accede vía Prisma con rol
-- privilegiado; clientes anon/authenticated no reciben acceso directo por PostgREST.
ALTER TABLE "UserAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserYearPermission" ENABLE ROW LEVEL SECURITY;
