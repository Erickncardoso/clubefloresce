-- CreateTable
CREATE TABLE "WhatsappMediaArchive" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "chatJid" TEXT,
    "mimeType" TEXT,
    "storageKey" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappMediaArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappMediaArchive_userId_messageId_key" ON "WhatsappMediaArchive"("userId", "messageId");

-- CreateIndex
CREATE INDEX "WhatsappMediaArchive_userId_chatJid_idx" ON "WhatsappMediaArchive"("userId", "chatJid");

-- AddForeignKey
ALTER TABLE "WhatsappMediaArchive" ADD CONSTRAINT "WhatsappMediaArchive_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
