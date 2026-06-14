-- CreateTable
CREATE TABLE "CheckInTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "frequency" TEXT NOT NULL DEFAULT 'weekly',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "steps" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckInTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInResponse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckInResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckInTemplate_active_sortOrder_idx" ON "CheckInTemplate"("active", "sortOrder");

-- CreateIndex
CREATE INDEX "CheckInTemplate_authorId_idx" ON "CheckInTemplate"("authorId");

-- CreateIndex
CREATE INDEX "CheckInResponse_templateId_periodKey_idx" ON "CheckInResponse"("templateId", "periodKey");

-- CreateIndex
CREATE INDEX "CheckInResponse_userId_idx" ON "CheckInResponse"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckInResponse_userId_templateId_periodKey_key" ON "CheckInResponse"("userId", "templateId", "periodKey");

-- AddForeignKey
ALTER TABLE "CheckInTemplate" ADD CONSTRAINT "CheckInTemplate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInResponse" ADD CONSTRAINT "CheckInResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInResponse" ADD CONSTRAINT "CheckInResponse_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CheckInTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
