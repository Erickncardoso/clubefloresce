-- Billing checkout sessions (carrinho abandonado)
CREATE TABLE "BillingCheckoutSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "reminder5SentAt" TIMESTAMP(3),
    "reminder15SentAt" TIMESTAMP(3),

    CONSTRAINT "BillingCheckoutSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BillingCheckoutSession_userId_completedAt_idx" ON "BillingCheckoutSession"("userId", "completedAt");
CREATE INDEX "BillingCheckoutSession_startedAt_idx" ON "BillingCheckoutSession"("startedAt");

ALTER TABLE "BillingCheckoutSession" ADD CONSTRAINT "BillingCheckoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Logs de notificações de billing (WhatsApp + e-mail)
CREATE TABLE "BillingNotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingNotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BillingNotificationLog_userId_createdAt_idx" ON "BillingNotificationLog"("userId", "createdAt");
CREATE INDEX "BillingNotificationLog_type_createdAt_idx" ON "BillingNotificationLog"("type", "createdAt");

ALTER TABLE "BillingNotificationLog" ADD CONSTRAINT "BillingNotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
