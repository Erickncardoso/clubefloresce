-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "plan" "UserPlan";
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "mercadoPagoPaymentId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "mercadoPagoPreapprovalId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "externalReference" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_mercadoPagoPaymentId_key" ON "Transaction"("mercadoPagoPaymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_externalReference_key" ON "Transaction"("externalReference");
CREATE INDEX IF NOT EXISTS "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Transaction_status_createdAt_idx" ON "Transaction"("status", "createdAt");

-- CreateTable
CREATE TABLE IF NOT EXISTS "BillingSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "UserPlan" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "mercadoPagoPreapprovalId" TEXT,
    "nextBillingAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BillingSubscription_mercadoPagoPreapprovalId_key" ON "BillingSubscription"("mercadoPagoPreapprovalId");
CREATE INDEX IF NOT EXISTS "BillingSubscription_userId_status_idx" ON "BillingSubscription"("userId", "status");

ALTER TABLE "BillingSubscription" DROP CONSTRAINT IF EXISTS "BillingSubscription_userId_fkey";
ALTER TABLE "BillingSubscription" ADD CONSTRAINT "BillingSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE IF NOT EXISTS "BillingWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "topic" TEXT,
    "payload" JSONB,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BillingWebhookEvent_eventKey_key" ON "BillingWebhookEvent"("eventKey");

-- Seed default plan prices (nutricionista pode alterar depois)
INSERT INTO "AppSetting" ("key", "value", "updatedAt") VALUES
  ('billing.premium.monthly_amount', '19.90', CURRENT_TIMESTAMP),
  ('billing.platinum.monthly_amount', '19.90', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
