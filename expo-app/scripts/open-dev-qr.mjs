/**
 * Abre página com QR code para Expo Go (Metro :8081).
 * No Cursor o QR do terminal não aparece — use esta página.
 */
import { networkInterfaces } from 'node:os';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const port = Number(process.env.EXPO_DEV_SERVER_PORT || 8081);

function getPreferredLanHost() {
  const explicit = process.env.EXPO_DEV_SERVER_HOST?.trim();
  if (explicit) return explicit;

  const candidates = [];
  for (const [iface, nets] of Object.entries(networkInterfaces())) {
    for (const net of nets || []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      const address = net.address;
      const score =
        /^(192\.168\.|10\.)/.test(address) ? 3
        : /^172\.(1[6-9]|2\d|3[0-1])\./.test(address) ? 2
        : /WSL|Hyper-V|vEthernet/i.test(iface) ? 0
        : 1;
      candidates.push({ iface, address, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.address || '127.0.0.1';
}

async function assertMetroRunning() {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/status`, { method: 'GET' });
    if (!res.ok) throw new Error(String(res.status));
  } catch {
    console.error(`[dev-qr] Metro offline em http://127.0.0.1:${port}`);
    console.error('[dev-qr] Rode primeiro: npm run dev:expo');
    process.exit(1);
  }
}

await assertMetroRunning();

const lanHost = getPreferredLanHost();
const qrPageUrl = `http://127.0.0.1:${port}/dev-qr.html?host=${encodeURIComponent(lanHost)}&port=${port}`;
const expUrl = `exp://${lanHost}:${port}`;

console.log('');
console.log('[dev-qr] URL Expo Go:', expUrl);
console.log('[dev-qr] Página com QR:', qrPageUrl);
console.log('[dev-qr] IP LAN detectado:', lanHost);
console.log('');

if (process.platform === 'win32') {
  spawn('cmd', ['/c', 'start', '', qrPageUrl], { stdio: 'ignore', detached: true }).unref();
} else if (process.platform === 'darwin') {
  spawn('open', [qrPageUrl], { stdio: 'ignore', detached: true }).unref();
} else {
  spawn('xdg-open', [qrPageUrl], { stdio: 'ignore', detached: true }).unref();
}
