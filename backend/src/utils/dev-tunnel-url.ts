import fs from "fs";
import path from "path";
import { readEnv } from "./env";

const TUNNEL_URL_FILE = path.resolve(__dirname, "../../.tunnel-public-url");

/**
 * Túneis trycloudflare são efêmeros: URL nova a cada execução do cloudflared.
 * Arquivo mais velho que isso = túnel quase certamente morto — ignorar, senão o
 * backend fica re-registrando o webhook da UAZAPI para uma URL inexistente
 * (foi exatamente o que quebrou o tempo real do chat).
 */
const TUNNEL_URL_FILE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

/** Prioriza webhook do tunnel local em dev (sobre WHATSAPP_WEBHOOK_URL de producao). */
export function resolveDevTunnelPublicUrl(): string | null {
  if (readEnv("NODE_ENV") === "production") return null;

  const fromEnv = readEnv("CLOUDFLARE_TUNNEL_URL");
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  if (readEnv("USE_CLOUDFLARE_TUNNEL") === "false") return null;

  try {
    const stat = fs.statSync(TUNNEL_URL_FILE);
    if (Date.now() - stat.mtimeMs > TUNNEL_URL_FILE_MAX_AGE_MS) {
      console.warn(
        `[Tunnel] .tunnel-public-url tem mais de 12h — ignorando (túnel provavelmente morto). ` +
        `Reinicie com scripts/dev-with-tunnel.mjs ou apague o arquivo.`,
      );
      return null;
    }
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
