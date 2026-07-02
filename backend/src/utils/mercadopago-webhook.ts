import crypto from "crypto";
import { getMercadoPagoWebhookSecret } from "./mercadopago-config";

type WebhookHeaders = {
  "x-signature"?: string;
  "x-request-id"?: string;
};

type WebhookQuery = {
  "data.id"?: string;
  id?: string;
  topic?: string;
  type?: string;
};

export function buildMercadoPagoWebhookEventKey(
  topic: string,
  resourceId: string,
  requestId?: string,
): string {
  return `${topic}:${resourceId}:${requestId || "no-request-id"}`;
}

export function extractMercadoPagoWebhookResourceId(
  query: WebhookQuery,
  body: Record<string, unknown>,
): { topic: string; resourceId: string } {
  const topic = String(query.topic || query.type || body?.type || body?.action || "unknown");
  const resourceId = String(
    query["data.id"]
    || query.id
    || (body?.data as any)?.id
    || body?.id
    || "",
  ).trim();

  if (!resourceId) {
    throw new Error("Webhook Mercado Pago sem identificador de recurso.");
  }

  return { topic, resourceId };
}

export function verifyMercadoPagoWebhookSignature(
  headers: WebhookHeaders,
  query: WebhookQuery,
  body?: Record<string, unknown>,
): boolean {
  const secret = getMercadoPagoWebhookSecret();
  if (!secret) {
    // Dev sem secret: aceita, mas loga aviso no controller.
    return process.env.NODE_ENV !== "production";
  }

  const signatureHeader = String(headers["x-signature"] || "");
  const requestId = String(headers["x-request-id"] || "");
  const dataId = String(
    query["data.id"]
    || query.id
    || (body?.data as { id?: string | number } | undefined)?.id
    || body?.id
    || "",
  );

  if (!signatureHeader || !requestId || !dataId) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((chunk) => {
      const [key, value] = chunk.split("=");
      return [key.trim(), value.trim()];
    }),
  );

  const ts = parts.ts;
  const receivedHash = parts.v1;
  if (!ts || !receivedHash) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expectedHash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  if (expectedHash.length !== receivedHash.length) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(receivedHash));
  } catch {
    return false;
  }
}

export function addBillingPeriodDays(from = new Date(), days = 30): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
}
