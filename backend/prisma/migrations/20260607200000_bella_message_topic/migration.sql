-- AlterTable
ALTER TABLE "BellaMessage" ADD COLUMN "topic" TEXT NOT NULL DEFAULT 'general';

-- CreateIndex
CREATE INDEX "BellaMessage_userId_topic_createdAt_idx" ON "BellaMessage"("userId", "topic", "createdAt");
