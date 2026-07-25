import { readEnv } from "./env";
import { resolveDevTunnelPublicUrl } from "./dev-tunnel-url";

export function getInstagramAppId(): string | null {
  return readEnv("INSTAGRAM_APP_ID");
}

export function getInstagramAppSecret(): string | null {
  return readEnv("INSTAGRAM_APP_SECRET");
}

export function getInstagramWebhookVerifyToken(): string | null {
  return readEnv("INSTAGRAM_WEBHOOK_VERIFY_TOKEN");
}

export function isInstagramConfigured(): boolean {
  return Boolean(getInstagramAppId() && getInstagramAppSecret() && getInstagramWebhookVerifyToken());
}

/**
 * Redirect URI do OAuth. Em dev, prioriza a URL pública do Cloudflare Tunnel
 * (a Meta não aceita http://localhost como redirect em apps Ao vivo).
 */
export function getInstagramRedirectUri(): string | null {
  const fromEnv = readEnv("INSTAGRAM_REDIRECT_URI");
  if (fromEnv) return fromEnv;

  const tunnel = resolveDevTunnelPublicUrl();
  if (tunnel) return `${tunnel}/api/instagram/oauth/callback`;

  return null;
}

/** Base do painel Nuxt para redirecionar após o OAuth. */
export function getFrontendBaseUrl(): string {
  return (readEnv("FRONTEND_URL") || "http://localhost:3000").replace(/\/+$/, "");
}
