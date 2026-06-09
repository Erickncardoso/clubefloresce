-- CreateEnum
CREATE TYPE "RegistrationRequestStatus" AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO');

-- CreateTable
CREATE TABLE "PatientRegistrationRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "status" "RegistrationRequestStatus" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientRegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientRegistrationRequest_email_idx" ON "PatientRegistrationRequest"("email");

-- CreateIndex
CREATE INDEX "PatientRegistrationRequest_status_createdAt_idx" ON "PatientRegistrationRequest"("status", "createdAt");
