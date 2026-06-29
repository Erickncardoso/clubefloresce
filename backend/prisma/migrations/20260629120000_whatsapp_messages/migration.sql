-- CreateTable
CREATE TABLE IF NOT EXISTS "WhatsappMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatJid" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "messageTimestamp" BIGINT NOT NULL,
    "fromMe" BOOLEAN NOT NULL DEFAULT false,
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappMessage_userId_messageId_key" ON "WhatsappMessage"("userId", "messageId");
CREATE INDEX IF NOT EXISTS "WhatsappMessage_userId_chatJid_messageTimestamp_idx" ON "WhatsappMessage"("userId", "chatJid", "messageTimestamp");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WhatsappMessage_userId_fkey'
  ) THEN
    ALTER TABLE "WhatsappMessage"
      ADD CONSTRAINT "WhatsappMessage_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
