-- WhatsappChat + WhatsappContactState (detalhes completos via /chat/details)

CREATE TABLE IF NOT EXISTS "WhatsappChat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatJid" TEXT NOT NULL,
    "name" TEXT,
    "pushName" TEXT,
    "avatarUrl" TEXT,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "lastMessage" TEXT,
    "lastMessageTime" BIGINT,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhatsappChat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappChat_userId_chatJid_key" ON "WhatsappChat"("userId", "chatJid");
CREATE INDEX IF NOT EXISTS "WhatsappChat_userId_lastMessageTime_idx" ON "WhatsappChat"("userId", "lastMessageTime");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WhatsappChat_userId_fkey'
  ) THEN
    ALTER TABLE "WhatsappChat"
      ADD CONSTRAINT "WhatsappChat_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "WhatsappContactState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactJid" TEXT NOT NULL,
    "isSaved" BOOLEAN NOT NULL DEFAULT false,
    "isBusiness" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "details" JSONB,
    "detailsSyncedAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhatsappContactState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappContactState_userId_contactJid_key" ON "WhatsappContactState"("userId", "contactJid");
CREATE INDEX IF NOT EXISTS "WhatsappContactState_userId_updatedAt_idx" ON "WhatsappContactState"("userId", "updatedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WhatsappContactState_userId_fkey'
  ) THEN
    ALTER TABLE "WhatsappContactState"
      ADD CONSTRAINT "WhatsappContactState_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "WhatsappContactState" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "WhatsappContactState" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "WhatsappContactState" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE "WhatsappContactState" ADD COLUMN IF NOT EXISTS "details" JSONB;
ALTER TABLE "WhatsappContactState" ADD COLUMN IF NOT EXISTS "detailsSyncedAt" TIMESTAMP(3);
