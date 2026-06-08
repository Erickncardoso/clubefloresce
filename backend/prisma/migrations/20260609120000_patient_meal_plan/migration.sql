-- CreateTable
CREATE TABLE "PatientMealPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "title" TEXT,
    "patientName" TEXT,
    "prescribedAt" TEXT,
    "plan" JSONB NOT NULL,
    "parserSource" TEXT NOT NULL DEFAULT 'dietbox',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientMealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientMealPlan_userId_key" ON "PatientMealPlan"("userId");

-- AddForeignKey
ALTER TABLE "PatientMealPlan" ADD CONSTRAINT "PatientMealPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
