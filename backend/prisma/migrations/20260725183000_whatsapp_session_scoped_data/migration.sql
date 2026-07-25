ALTER TABLE "WhatsappMessage" ADD COLUMN IF NOT EXISTS "sessionJid" TEXT;
ALTER TABLE "WhatsappChat" ADD COLUMN IF NOT EXISTS "sessionJid" TEXT;

CREATE INDEX IF NOT EXISTS "WhatsappMessage_userId_sessionJid_chatJid_messageTimestamp_idx"
  ON "WhatsappMessage"("userId", "sessionJid", "chatJid", "messageTimestamp");

CREATE INDEX IF NOT EXISTS "WhatsappChat_userId_sessionJid_lastMessageTime_idx"
  ON "WhatsappChat"("userId", "sessionJid", "lastMessageTime");
