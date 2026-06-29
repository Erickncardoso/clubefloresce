/**
 * Cloudflare Tunnel rápido para o app paciente (porta 3002).
 * Requer backend (:3001) e cliente (:3002) já rodando.
 * A API no celular usa /api (proxy do Vite → backend local).
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import { startCloudflareTunnel, CLIENTE_TUNNEL_URL_FILE } from "./cloudflare-tunnel.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BACKEND_ORIGIN = process.env.NUXT_DEV_API_ORIGIN || "http://127.0.0.1:3001";
const CLIENTE_PORT = process.env.NUXT_CLIENTE_PORT || "3002";

async function assertReachable(url, label) {
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok && res.status !== 404) {
      console.error(`[Tunnel] ${label} respondeu ${res.status} em ${url}`);
      process.exit(1);
    }
  } catch {
    console.error(`[Tunnel] ${label} offline em ${url}`);
    process.exit(1);
  }
}

console.log("[Tunnel] Verificando serviços locais...");
await assertReachable(`${BACKEND_ORIGIN}/api/health`, "Backend");
await assertReachable(`http://127.0.0.1:${CLIENTE_PORT}/`, "App paciente");

console.log("[Tunnel] Abrindo HTTPS público para o PWA (porta", CLIENTE_PORT + ")...");

const tunnel = startCloudflareTunnel({
  port: CLIENTE_PORT,
  urlFile: CLIENTE_TUNNEL_URL_FILE,
  label: "PWA",
});

const shutdown = () => {
  tunnel.kill("SIGINT");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
