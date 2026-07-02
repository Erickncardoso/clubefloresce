import { readEnv } from "./env";

export function getMercadoPagoAccessToken(): string | null {
  return readEnv("MERCADOPAGO_ACCESS_TOKEN");
}

export function getMercadoPagoPublicKey(): string | null {
  return readEnv("MERCADOPAGO_PUBLIC_KEY");
}

export function getMercadoPagoWebhookSecret(): string | null {
  return readEnv("MERCADOPAGO_WEBHOOK_SECRET");
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(getMercadoPagoAccessToken() && getMercadoPagoPublicKey());
}

export function isMercadoPagoTestMode(): boolean {
  const token = getMercadoPagoAccessToken() || "";
  const key = getMercadoPagoPublicKey() || "";
  return token.startsWith("TEST-") || key.startsWith("TEST-");
}

/** E-mail comprador exigido pelo sandbox MP (Contas de teste → Comprador). */
export function getMercadoPagoSandboxPayerEmail(): string {
  return readEnv("MERCADOPAGO_SANDBOX_PAYER_EMAIL") || "test@testuser.com";
}

export function resolveMercadoPagoPayerEmail(patientEmail: string): string {
  const normalized = String(patientEmail || "").trim();
  if (isMercadoPagoTestMode()) {
    return getMercadoPagoSandboxPayerEmail();
  }
  return normalized;
}

export function getBillingWebhookUrl(): string | null {
  const base = readEnv("BACKEND_PUBLIC_URL") || readEnv("CLOUDFLARE_TUNNEL_URL");
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/api/billing/webhook`;
}

export function getPatientAppUrl(): string {
  return readEnv("PATIENT_APP_URL") || "http://127.0.0.1:3002";
}

/** Dev local: aprova assinatura no cartão sem chamar MP (sandbox MP é instável). */
export function isBillingSandboxSimulateCard(): boolean {
  return isMercadoPagoTestMode() && readEnv("BILLING_SANDBOX_SIMULATE_CARD") === "true";
}
