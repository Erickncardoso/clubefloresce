import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TUNNEL_URL_FILE = path.join(ROOT, "backend", ".tunnel-public-url");
const TUNNEL_URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;
const BACKEND_PORT = process.env.BACKEND_PORT || "3001";

function findCloudflaredExecutable() {
  const fromEnv = process.env.CLOUDFLARED_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  if (process.platform === "win32") {
    const wingetRoot = path.join(
      process.env.LOCALAPPDATA || "",
      "Microsoft",
      "WinGet",
      "Packages",
    );
    try {
      const pkg = fs
        .readdirSync(wingetRoot)
        .find((name) => name.startsWith("Cloudflare.cloudflared_"));
      if (pkg) {
        const exe = path.join(wingetRoot, pkg, "cloudflared.exe");
        if (fs.existsSync(exe)) return exe;
      }
    } catch {
      /* ignore */
    }
  }

  return "cloudflared";
}

function writeTunnelUrl(url) {
  fs.writeFileSync(TUNNEL_URL_FILE, `${url}\n`, "utf8");
}

function removeTunnelUrlFile() {
  try {
    fs.unlinkSync(TUNNEL_URL_FILE);
  } catch {
    /* ignore */
  }
}

function logTunnelReady(url) {
  console.log("");
  console.log("[Tunnel] URL publica:", url);
  console.log("[Tunnel] Webhook WhatsApp:", `${url}/api/whatsapp/webhook`);
  console.log("[Tunnel] Arquivo:", TUNNEL_URL_FILE);
  console.log("");
}

function buildTunnelArgs(named) {
  if (named) {
    const configPath = path.join(ROOT, ".cloudflared", "config.yml");
    if (!fs.existsSync(configPath)) {
      console.error("[Tunnel] Falta .cloudflared/config.yml — copie de config.yml.example");
      process.exit(1);
    }
    return ["tunnel", "run", "--config", configPath];
  }
  return ["tunnel", "--url", `http://localhost:${BACKEND_PORT}`];
}

function resolveNamedTunnelUrl() {
  const fromEnv = process.env.CLOUDFLARE_TUNNEL_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const configPath = path.join(ROOT, ".cloudflared", "config.yml");
  if (!fs.existsSync(configPath)) return null;

  const text = fs.readFileSync(configPath, "utf8");
  const match = text.match(/hostname:\s*(\S+)/);
  if (!match?.[1]) return null;
  return `https://${match[1]}`;
}

export function startCloudflareTunnel(options = {}) {
  const { named = false, onReady } = options;
  const executable = findCloudflaredExecutable();
  const args = buildTunnelArgs(named);
  let readyNotified = false;

  const child = spawn(executable, args, {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });

  const notifyReady = (url) => {
    if (readyNotified || !url) return;
    readyNotified = true;
    writeTunnelUrl(url);
    logTunnelReady(url);
    if (onReady) onReady(url);
  };

  if (named) {
    const namedUrl = resolveNamedTunnelUrl();
    if (namedUrl) {
      setTimeout(() => notifyReady(namedUrl), 2500);
    }
  }

  const onChunk = (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    const match = text.match(TUNNEL_URL_RE);
    if (match) notifyReady(match[0]);
  };

  child.stdout.on("data", onChunk);
  child.stderr.on("data", onChunk);

  child.on("exit", (code) => {
    removeTunnelUrlFile();
    if (!readyNotified && code !== 0) {
      console.error(`[Tunnel] cloudflared encerrou com codigo ${code ?? "?"}`);
    }
  });

  return child;
}

const isMainModule = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  const named = process.argv.includes("--named");
  const tunnel = startCloudflareTunnel({ named });

  const shutdown = () => {
    removeTunnelUrlFile();
    tunnel.kill("SIGINT");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
