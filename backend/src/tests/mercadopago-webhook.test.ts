import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import {
  addBillingPeriodDays,
  buildMercadoPagoWebhookEventKey,
  extractMercadoPagoWebhookResourceId,
  verifyMercadoPagoWebhookSignature,
} from "../utils/mercadopago-webhook";

test("buildMercadoPagoWebhookEventKey: chave idempotente estável", () => {
  const key = buildMercadoPagoWebhookEventKey("payment", "12345", "req-abc");
  assert.equal(key, "payment:12345:req-abc");
});

test("extractMercadoPagoWebhookResourceId: lê data.id da query", () => {
  const result = extractMercadoPagoWebhookResourceId(
    { topic: "payment", "data.id": "999" },
    {},
  );
  assert.equal(result.topic, "payment");
  assert.equal(result.resourceId, "999");
});

test("extractMercadoPagoWebhookResourceId: fallback para body.data.id", () => {
  const result = extractMercadoPagoWebhookResourceId(
    {},
    { type: "payment", data: { id: "777" } },
  );
  assert.equal(result.resourceId, "777");
});

test("extractMercadoPagoWebhookResourceId: falha sem id", () => {
  assert.throws(
    () => extractMercadoPagoWebhookResourceId({}, {}),
    /sem identificador/,
  );
});

test("addBillingPeriodDays: adiciona 30 dias por padrão", () => {
  const base = new Date("2026-01-01T12:00:00.000Z");
  const next = addBillingPeriodDays(base, 30);
  assert.equal(next.getUTCDate(), 31);
});

test("verifyMercadoPagoWebhookSignature: aceita em dev sem secret", () => {
  const prevSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const prevEnv = process.env.NODE_ENV;
  delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  process.env.NODE_ENV = "development";

  assert.equal(
    verifyMercadoPagoWebhookSignature({}, { id: "1" }),
    true,
  );

  if (prevSecret) process.env.MERCADOPAGO_WEBHOOK_SECRET = prevSecret;
  process.env.NODE_ENV = prevEnv;
});

test("verifyMercadoPagoWebhookSignature: valida HMAC quando secret definido", () => {
  const secret = "test-webhook-secret";
  const prevSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  process.env.MERCADOPAGO_WEBHOOK_SECRET = secret;

  const dataId = "123456";
  const requestId = "req-001";
  const ts = "1700000000";
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  assert.equal(
    verifyMercadoPagoWebhookSignature(
      {
        "x-signature": `ts=${ts},v1=${hash}`,
        "x-request-id": requestId,
      },
      { "data.id": dataId },
    ),
    true,
  );

  assert.equal(
    verifyMercadoPagoWebhookSignature(
      {
        "x-signature": `ts=${ts},v1=deadbeef`,
        "x-request-id": requestId,
      },
      { "data.id": dataId },
    ),
    false,
  );

  if (prevSecret) process.env.MERCADOPAGO_WEBHOOK_SECRET = prevSecret;
  else delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
});
