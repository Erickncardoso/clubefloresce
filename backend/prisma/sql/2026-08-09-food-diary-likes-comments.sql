-- Additive only: FoodDiary social (likes + comments)
-- Applied on 2026-08-09 to avoid prisma db push dropping unrelated WhatsappInstance rows.

CREATE TABLE IF NOT EXISTS "FoodDiaryLike" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FoodDiaryLike_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FoodDiaryComment" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FoodDiaryComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FoodDiaryLike_entryId_idx" ON "FoodDiaryLike"("entryId");
CREATE UNIQUE INDEX IF NOT EXISTS "FoodDiaryLike_entryId_userId_key" ON "FoodDiaryLike"("entryId", "userId");
CREATE INDEX IF NOT EXISTS "FoodDiaryComment_entryId_createdAt_idx" ON "FoodDiaryComment"("entryId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "FoodDiaryLike" ADD CONSTRAINT "FoodDiaryLike_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FoodDiaryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "FoodDiaryLike" ADD CONSTRAINT "FoodDiaryLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "FoodDiaryComment" ADD CONSTRAINT "FoodDiaryComment_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FoodDiaryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "FoodDiaryComment" ADD CONSTRAINT "FoodDiaryComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
