-- CreateTable
CREATE TABLE "CheckInDispatchSchedule" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "userIds" JSONB NOT NULL DEFAULT '[]',
    "periodDate" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "title" TEXT,
    "body" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckInDispatchSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckInDispatchSchedule_status_scheduledAt_idx" ON "CheckInDispatchSchedule"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "CheckInDispatchSchedule_authorId_idx" ON "CheckInDispatchSchedule"("authorId");

-- AddForeignKey
ALTER TABLE "CheckInDispatchSchedule" ADD CONSTRAINT "CheckInDispatchSchedule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CheckInTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInDispatchSchedule" ADD CONSTRAINT "CheckInDispatchSchedule_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
