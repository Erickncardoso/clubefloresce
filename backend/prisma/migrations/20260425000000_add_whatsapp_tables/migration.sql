-- CreateTable: WhatsappContactDirectory
CREATE TABLE IF NOT EXISTS "WhatsappContactDirectory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhatsappContactDirectory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappContactDirectory_userId_key" ON "WhatsappContactDirectory"("userId");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WhatsappContactDirectory_userId_fkey'
  ) THEN
    ALTER TABLE "WhatsappContactDirectory"
      ADD CONSTRAINT "WhatsappContactDirectory_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
