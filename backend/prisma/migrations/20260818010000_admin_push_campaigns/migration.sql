-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "AdminPushCampaign" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "actionPath" TEXT,
    "imageUrl" TEXT,
    "buttonKey" TEXT,
    "categoryId" TEXT,
    "audience" TEXT NOT NULL,
    "userIds" JSONB NOT NULL DEFAULT '[]',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminPushCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminPushCampaign_status_scheduledAt_idx" ON "AdminPushCampaign"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "AdminPushCampaign_authorId_idx" ON "AdminPushCampaign"("authorId");

-- AddForeignKey
ALTER TABLE "AdminPushCampaign" ADD CONSTRAINT "AdminPushCampaign_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
