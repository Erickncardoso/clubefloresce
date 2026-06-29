import fs from "fs";
import path from "path";
import { readEnv } from "./env";

const TUNNEL_URL_FILE = path.resolve(__dirname, "../../.tunnel-public-url");

/** Prioriza webhook do tunnel local em dev (sobre WHATSAPP_WEBHOOK_URL de producao). */
export function resolveDevTunnelPublicUrl(): string | null {
  if (readEnv("NODE_ENV") === "production") return null;

  const fromEnv = readEnv("CLOUDFLARE_TUNNEL_URL");
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  if (readEnv("USE_CLOUDFLARE_TUNNEL") === "false") return null;

  try {
    const raw = fs.readFileSync(TUNNEL_URL_FILE, "utf8").trim();
    if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, "");
  } catch {
    /* arquivo ausente */
  }

  return null;
}

export function getDevTunnelWebhookUrl(): string | null {
  const base = resolveDevTunnelPublicUrl();
  if (!base) return null;
  return `${base}/api/whatsapp/webhook`;
}

export function getTunnelUrlFilePath(): string {
  return TUNNEL_URL_FILE;
}
