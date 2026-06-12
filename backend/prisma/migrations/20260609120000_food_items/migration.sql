-- CreateEnum
CREATE TYPE "FoodSource" AS ENUM ('TACO', 'TBCA');

-- CreateTable
CREATE TABLE "FoodItem" (
    "id" TEXT NOT NULL,
    "source" "FoodSource" NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "nutrients" JSONB NOT NULL,
    "caloriesKcal" DOUBLE PRECISION,
    "proteinG" DOUBLE PRECISION,
    "carbsG" DOUBLE PRECISION,
    "fatG" DOUBLE PRECISION,
    "fiberG" DOUBLE PRECISION,
    "sodiumMg" DOUBLE PRECISION,
    "searchText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FoodItem_source_sourceCode_key" ON "FoodItem"("source", "sourceCode");

-- CreateIndex
CREATE INDEX "FoodItem_name_idx" ON "FoodItem"("name");

-- CreateIndex
CREATE INDEX "FoodItem_searchText_idx" ON "FoodItem"("searchText");

-- CreateIndex
CREATE INDEX "FoodItem_source_idx" ON "FoodItem"("source");
