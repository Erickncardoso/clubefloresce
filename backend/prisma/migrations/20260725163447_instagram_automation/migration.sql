-- CreateEnum
CREATE TYPE "InstagramMatchType" AS ENUM ('EXACT', 'CONTAINS');

-- CreateEnum
CREATE TYPE "InstagramQueueStatus" AS ENUM ('pending', 'sending', 'sent', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "InstagramQueueKind" AS ENUM ('PRIVATE_REPLY', 'PUBLIC_REPLY', 'WELCOME_DM', 'FOLLOWUP');

-- CreateTable
CREATE TABLE "InstagramConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "instagramUserId" TEXT NOT NULL,
    "instagramUsername" TEXT NOT NULL,
    "profilePictureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramAutomation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "triggerComment" BOOLEAN NOT NULL DEFAULT true,
    "triggerStory" BOOLEAN NOT NULL DEFAULT false,
    "triggerDm" BOOLEAN NOT NULL DEFAULT false,
    "keywords" JSONB NOT NULL DEFAULT '[]',
    "matchType" "InstagramMatchType" NOT NULL DEFAULT 'CONTAINS',
    "targetMediaId" TEXT,
    "publicReplyVariations" JSONB NOT NULL DEFAULT '[]',
    "welcomeMessage" TEXT NOT NULL,
    "quickReplyLabel" TEXT NOT NULL DEFAULT 'Quero o link!',
    "linkText" TEXT,
    "linkButtonLabel" TEXT,
    "linkUrl" TEXT,
    "reminderText" TEXT,
    "reminderDelayMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramFollowup" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'message',
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "body" TEXT NOT NULL,
    "buttonLabel" TEXT,
    "url" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramFollowup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instagramScopedId" TEXT NOT NULL,
    "username" TEXT,
    "firstContactAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReplyAt" TIMESTAMP(3),
    "lastAutomationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramQueueItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "automationId" TEXT,
    "kind" "InstagramQueueKind" NOT NULL,
    "status" "InstagramQueueStatus" NOT NULL DEFAULT 'pending',
    "recipientId" TEXT,
    "commentId" TEXT,
    "payload" JSONB NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "claimedBy" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "field" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstagramEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstagramConfig_userId_key" ON "InstagramConfig"("userId");

-- CreateIndex
CREATE INDEX "InstagramConfig_tokenExpiresAt_idx" ON "InstagramConfig"("tokenExpiresAt");

-- CreateIndex
CREATE INDEX "InstagramAutomation_userId_active_idx" ON "InstagramAutomation"("userId", "active");

-- CreateIndex
CREATE INDEX "InstagramFollowup_automationId_sortOrder_idx" ON "InstagramFollowup"("automationId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramContact_instagramScopedId_key" ON "InstagramContact"("instagramScopedId");

-- CreateIndex
CREATE INDEX "InstagramContact_userId_lastReplyAt_idx" ON "InstagramContact"("userId", "lastReplyAt");

-- CreateIndex
CREATE INDEX "InstagramQueueItem_status_scheduledFor_idx" ON "InstagramQueueItem"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "InstagramQueueItem_userId_createdAt_idx" ON "InstagramQueueItem"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "InstagramEvent_createdAt_idx" ON "InstagramEvent"("createdAt");

-- CreateIndex
CREATE INDEX "InstagramEvent_field_createdAt_idx" ON "InstagramEvent"("field", "createdAt");

-- AddForeignKey
ALTER TABLE "InstagramConfig" ADD CONSTRAINT "InstagramConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramAutomation" ADD CONSTRAINT "InstagramAutomation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramFollowup" ADD CONSTRAINT "InstagramFollowup_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "InstagramAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramContact" ADD CONSTRAINT "InstagramContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramQueueItem" ADD CONSTRAINT "InstagramQueueItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramQueueItem" ADD CONSTRAINT "InstagramQueueItem_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "InstagramAutomation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramEvent" ADD CONSTRAINT "InstagramEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
