CREATE TABLE IF NOT EXISTS "WhatsappSessionBinding" (
    "userId" TEXT NOT NULL,
    "sessionJid" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappSessionBinding_pkey" PRIMARY KEY ("userId")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WhatsappSessionBinding_userId_fkey'
  ) THEN
    ALTER TABLE "WhatsappSessionBinding"
      ADD CONSTRAINT "WhatsappSessionBinding_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
