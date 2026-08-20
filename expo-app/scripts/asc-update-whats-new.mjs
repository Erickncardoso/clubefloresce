import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const key = fs.readFileSync(path.join(ROOT, 'credentials/asc-api-key.p8'));
const token = () =>
  jwt.sign({}, key, {
    algorithm: 'ES256',
    expiresIn: '20m',
    issuer: 'f800fd31-89d4-4b7d-af7d-20f800cbd63e',
    audience: 'appstoreconnect-v1',
    header: { alg: 'ES256', kid: 'FML385PGPZ', typ: 'JWT' },
  });

const WHATS_NEW = `O que há de novo:

• App mais estável e rápido ao abrir
• Fotografe sua refeição com a câmera — a Bella analisa o prato na hora
• Acompanhe sua meta de água na Live Activity (iOS 16.2+)
• Melhorias gerais para deixar seu dia a dia mais leve`;

const VERSION = '85ac7840-d89d-4d32-b62d-e6cab5452220';

async function api(method, urlPath, body) {
  const res = await fetch(`https://api.appstoreconnect.apple.com/v1${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json;
}

const locs = await api('GET', `/appStoreVersions/${VERSION}/appStoreVersionLocalizations`);
for (const loc of locs.data ?? []) {
  await api('PATCH', `/appStoreVersionLocalizations/${loc.id}`, {
    data: {
      type: 'appStoreVersionLocalizations',
      id: loc.id,
      attributes: { whatsNew: WHATS_NEW },
    },
  });
  console.log('Atualizado:', loc.attributes.locale);
}
