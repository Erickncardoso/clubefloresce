import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startCloudflareTunnel } from "./cloudflare-tunnel.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BACKEND_PORT = process.env.BACKEND_PORT || "3001";

let backendProcess = null;
let tunnelProcess = null;

function startBackend(tunnelUrl) {
  if (backendProcess) return;

  const env = {
    ...process.env,
    CLOUDFLARE_TUNNEL_URL: tunnelUrl,
    BACKEND_PUBLIC_URL: tunnelUrl,
    WHATSAPP_WEBHOOK_URL: `${tunnelUrl}/api/whatsapp/webhook`,
  };

  console.log("[Tunnel] Subindo backend com webhook apontando para o tunnel...");

  backendProcess = spawn("npm", ["run", "dev", "--prefix", "backend"], {
    cwd: ROOT,
    env,
    stdio: "inherit",
    shell: true,
  });

  backendProcess.on("exit", (code) => {
    backendProcess = null;
    shutdown(code ?? 0);
  });
}

function shutdown(exitCode = 0) {
  if (tunnelProcess && !tunnelProcess.killed) {
    tunnelProcess.kill("SIGINT");
  }
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill("SIGINT");
  }
  process.exit(exitCode);
}

const named = process.argv.includes("--named");

tunnelProcess = startCloudflareTunnel({
  named,
  onReady: (url) => startBackend(url),
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
