-- CreateTable
CREATE TABLE "CommunityUserBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityUserBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityUserBlock_blockerId_createdAt_idx" ON "CommunityUserBlock"("blockerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityUserBlock_blockerId_blockedId_key" ON "CommunityUserBlock"("blockerId", "blockedId");

-- AddForeignKey
ALTER TABLE "CommunityUserBlock" ADD CONSTRAINT "CommunityUserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityUserBlock" ADD CONSTRAINT "CommunityUserBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
