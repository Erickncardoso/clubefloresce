/**
 * Configura webhook da WuzAPI para o tunnel local e valida o endpoint.
 * Uso: node scripts/wuzapi-setup-local-webhook.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TUNNEL_FILE = path.join(ROOT, "backend", ".tunnel-public-url");
const ENV_FILE = path.join(ROOT, "backend", ".env");

function loadEnvFile(filePath) {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = value;
    }
  } catch {
    /* ignore */
  }
}

loadEnvFile(ENV_FILE);

const wuzBase = String(process.env.WUZAPI_SERVER_URL || "").replace(/\/+$/, "");
const token = String(process.env.WUZAPI_USER_TOKEN || "").trim();
const localPort = process.env.PORT || "3001";

function readTunnelUrl() {
  const fromEnv = String(process.env.CLOUDFLARE_TUNNEL_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  try {
    const raw = fs.readFileSync(TUNNEL_FILE, "utf8").trim();
    if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, "");
  } catch {
    /* ignore */
  }
  return "";
}

async function wuzFetch(method, apiPath, body) {
  const res = await fetch(`${wuzBase}${apiPath}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      token,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${apiPath} HTTP ${res.status}: ${parsed.error || parsed.message || text}`);
  }
  return parsed;
}

async function testWebhook(url, label) {
  const payload = {
    token,
    type: "Message",
    event: {
      Info: {
        ID: `TEST-LOCAL-${Date.now()}`,
        RemoteJid: "5511947305403@s.whatsapp.net",
        SenderAlt: "5511947305403@s.whatsapp.net",
        IsFromMe: false,
        Timestamp: Math.floor(Date.now() / 1000),
      },
      Message: { conversation: `Teste webhook ${label} ${new Date().toISOString()}` },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  console.log(`[Teste ${label}] ${res.status} ${text}`);
  return res.ok;
}

async function main() {
  if (!wuzBase || !token) {
    console.error("Configure WUZAPI_SERVER_URL e WUZAPI_USER_TOKEN no backend/.env");
    process.exit(1);
  }

  const tunnelBase = readTunnelUrl();
  if (!tunnelBase) {
    console.error("Tunnel ausente. Rode: npm run dev:backend:tunnel");
    process.exit(1);
  }

  const webhookUrl = `${tunnelBase}/api/whatsapp/webhook`;
  const events = ["Message", "ReadReceipt", "Presence", "HistorySync", "ChatPresence"];

  console.log("[WuzAPI] Base:", wuzBase);
  console.log("[WuzAPI] Webhook alvo:", webhookUrl);

  const before = await wuzFetch("GET", "/webhook");
  console.log("[WuzAPI] Webhook antes:", before?.data?.webhook || before?.data?.WebhookURL || "(vazio)");

  await wuzFetch("POST", "/webhook", { webhook: webhookUrl, webhookurl: webhookUrl, events });

  const after = await wuzFetch("GET", "/webhook");
  const confirmed = after?.data?.webhook || after?.data?.WebhookURL || "";
  console.log("[WuzAPI] Webhook depois:", confirmed);

  if (confirmed !== webhookUrl) {
    console.warn("[WuzAPI] URL confirmada difere do alvo — verifique manualmente.");
  }

  const status = await wuzFetch("GET", "/session/status");
  console.log(
    "[WuzAPI] Sessão:",
    "connected=", status?.data?.connected,
    "loggedIn=", status?.data?.loggedIn,
    "jid=", status?.data?.jid || "",
  );

  await testWebhook(webhookUrl, "tunnel");
  await testWebhook(`http://127.0.0.1:${localPort}/api/whatsapp/webhook`, "localhost");

  console.log("[OK] Webhook local configurado. Envie uma mensagem real para validar [Webhook] nos logs.");
}

main().catch((err) => {
  console.error("[Erro]", err.message || err);
  process.exit(1);
});
