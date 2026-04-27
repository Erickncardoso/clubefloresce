-- CreateTable
CREATE TABLE "WhatsappGroupObservedSenders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupJid" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappGroupObservedSenders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsappGroupObservedSenders_userId_idx" ON "WhatsappGroupObservedSenders"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappGroupObservedSenders_userId_groupJid_key" ON "WhatsappGroupObservedSenders"("userId", "groupJid");

-- AddForeignKey
ALTER TABLE "WhatsappGroupObservedSenders" ADD CONSTRAINT "WhatsappGroupObservedSenders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
