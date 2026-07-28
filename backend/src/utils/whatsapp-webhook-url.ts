import { readEnv } from "./env";
import { getDevTunnelWebhookUrl, resolveDevTunnelPublicUrl } from "./dev-tunnel-url";

const PRODUCTION_WEBHOOK_HOSTS = [
  "apiclube.nutrisabellajardim.com.br",
];

export function isProductionRuntime(): boolean {
  return readEnv("NODE_ENV") === "production";
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function buildWebhookFromBackendPublic(base: string): string {
  return `${normalizeUrl(base)}/api/whatsapp/webhook`;
}

/** Detecta URL de webhook de produção (não deve ser registrada na WuzAPI em dev local). */
export function looksLikeProductionWebhookUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return PRODUCTION_WEBHOOK_HOSTS.some((candidate) => host === candidate || host.endsWith(`.${candidate}`));
  } catch {
    return false;
  }
}

/**
 * URL que a WuzAPI deve chamar ao receber eventos.
 * - Produção: WHATSAPP_WEBHOOK_URL ou BACKEND_PUBLIC_URL/api/whatsapp/webhook
 * - Dev: tunnel Cloudflare > WHATSAPP_WEBHOOK_URL_LOCAL > WHATSAPP_WEBHOOK_URL (se não for prod)
 */
export function resolveWhatsappWebhookUrl(): string {
  const explicit = readEnv("WHATSAPP_WEBHOOK_URL");
  const localExplicit = readEnv("WHATSAPP_WEBHOOK_URL_LOCAL");
  const backendPublic = readEnv("BACKEND_PUBLIC_URL");

  if (isProductionRuntime()) {
    if (explicit) return normalizeUrl(explicit);
    if (backendPublic) return buildWebhookFromBackendPublic(backendPublic);
    return "";
  }

  const tunnel = getDevTunnelWebhookUrl();
  if (tunnel) return tunnel;

  if (localExplicit) return normalizeUrl(localExplicit);

  if (explicit && !looksLikeProductionWebhookUrl(explicit)) {
    return normalizeUrl(explicit);
  }

  return "";
}

export function describeWhatsappWebhookEnvironment(): "production" | "development-tunnel" | "development-local" {
  if (isProductionRuntime()) return "production";
  if (resolveDevTunnelPublicUrl()) return "development-tunnel";
  return "development-local";
}

export function logWhatsappWebhookTarget(): void {
  const url = resolveWhatsappWebhookUrl();
  const env = describeWhatsappWebhookEnvironment();
  if (url) {
    console.log(`[WhatsApp Webhook] ${env} → ${url}`);
    return;
  }
  if (isProductionRuntime()) {
    console.warn("[WhatsApp Webhook] WHATSAPP_WEBHOOK_URL/BACKEND_PUBLIC_URL ausente — eventos não chegam ao backend.");
    return;
  }
  console.warn(
    "[WhatsApp Webhook] Dev sem URL pública — inicie com tunnel (scripts/dev-with-tunnel) "
    + "ou defina WHATSAPP_WEBHOOK_URL_LOCAL.",
  );
}
