/**
 * Abre o mockup iPhone (`simulator.html`) apontando para o Expo Web (:8081).
 */
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = join(import.meta.dirname, '..');
const port = Number(process.env.EXPO_DEV_SERVER_PORT || 8081);
const host = process.env.EXPO_DEV_SERVER_HOST || '127.0.0.1';
const appUrl = process.env.EXPO_WEB_URL || `http://${host}:${port}`;

const simulatorFile = join(root, 'public', 'simulator.html');
const fileUrl = `${pathToFileURL(simulatorFile).href}?app=${encodeURIComponent(appUrl)}`;
const metroUrl = `${appUrl}/simulator.html?app=${encodeURIComponent(appUrl)}`;

console.log('');
console.log('[simulator] App (iframe):', appUrl);
console.log('[simulator] Abrir mockup (recomendado):', metroUrl);
console.log('[simulator] Arquivo local:', fileUrl);
console.log('[simulator] Certifique-se de que o Expo está rodando (npm run dev:expo).');
console.log('');

if (process.platform === 'win32') {
  spawn('cmd', ['/c', 'start', '', metroUrl], { stdio: 'ignore', detached: true }).unref();
} else if (process.platform === 'darwin') {
  spawn('open', [metroUrl], { stdio: 'ignore', detached: true }).unref();
} else {
  spawn('xdg-open', [metroUrl], { stdio: 'ignore', detached: true }).unref();
}
