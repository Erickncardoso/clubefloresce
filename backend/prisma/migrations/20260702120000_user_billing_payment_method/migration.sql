-- Forma de pagamento definida pela nutricionista ou sincronizada do Mercado Pago (pix | card)
ALTER TABLE "User" ADD COLUMN "billingPaymentMethod" TEXT;
