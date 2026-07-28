/**
 * Dev do app Expo — consome o backend local (:3001) por padrão.
 * A URL da API é resolvida em runtime (IP da LAN via Metro / emulador Android).
 */
import { networkInterfaces } from 'node:os';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const backendOrigin = process.env.EXPO_DEV_API_ORIGIN || 'http://127.0.0.1:3001';
const useProdApi = process.argv.includes('--prod');
const clearCache = process.argv.includes('--clear') || process.argv.includes('-c');

function getLanAddresses() {
  const addresses = [];
  for (const [iface, nets] of Object.entries(networkInterfaces())) {
    for (const net of nets || []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      addresses.push({ iface, address: net.address });
    }
  }
  return addresses;
}

function printInstructions(apiHint) {
  const lanAddresses = getLanAddresses();
  console.log('');
  console.log('[expo:dev] API (runtime):', apiHint);
  console.log('[expo:dev] Backend esperado:', `${backendOrigin}/api`);
  if (lanAddresses.length === 0) {
    console.log('[expo:dev] Celular na Wi-Fi: o app usa o IP do Metro automaticamente.');
  } else {
    console.log('[expo:dev] Celular na mesma Wi-Fi — backend acessível em:');
    for (const { iface, address } of lanAddresses) {
      console.log(`  http://${address}:3001/api  (${iface})`);
    }
  }
  console.log('');
  console.log('[expo:dev] Simulador iOS: http://127.0.0.1:3001/api');
  console.log('[expo:dev] Emulador Android: http://10.0.2.2:3001/api');
  if (process.platform === 'win32') {
    console.log('[expo:dev] Firewall: permita Node.js nas portas 3001 e 8081 se o celular não conectar.');
  }
  if (useProdApi) {
    console.log('[expo:dev] Modo --prod: API publicada (apiclube), não o backend local.');
  } else {
    console.log('[expo:dev] Modo local (padrão). Produção: npm run dev:expo:prod');
  }
  console.log('[expo:dev] Mockup iPhone: npm run simulator (ou http://127.0.0.1:8081/simulator.html)');
  console.log('');
}

async function assertBackendReachable() {
  if (useProdApi) return;

  try {
    const res = await fetch(`${backendOrigin}/api/health`, { method: 'GET' });
    if (!res.ok) {
      console.error('[expo:dev] ERRO: backend respondeu', res.status, 'em', backendOrigin);
      process.exit(1);
    }
  } catch {
    console.error('[expo:dev] ERRO: backend offline em', backendOrigin);
    console.error('[expo:dev] Rode primeiro: npm run dev:backend');
    process.exit(1);
  }
}

await assertBackendReachable();

const apiHint = useProdApi
  ? 'https://apiclube.nutrisabellajardim.com.br/api'
  : 'auto → backend local (IP detectado pelo Expo)';

printInstructions(apiHint);

const expoArgs = clearCache ? ['run', 'start:clear'] : ['run', 'start'];

const child = spawn(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  expoArgs,
  {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      EXPO_PUBLIC_API_BASE: useProdApi
        ? 'https://apiclube.nutrisabellajardim.com.br/api'
        : 'auto',
    },
  },
);

child.on('exit', (code) => process.exit(code ?? 0));
