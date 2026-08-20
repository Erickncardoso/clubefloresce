import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const key = fs.readFileSync(path.join(ROOT, 'credentials/asc-api-key.p8'));
const APP_ID = '6795381418';

function token() {
  return jwt.sign({}, key, {
    algorithm: 'ES256',
    expiresIn: '20m',
    issuer: 'f800fd31-89d4-4b7d-af7d-20f800cbd63e',
    audience: 'appstoreconnect-v1',
    header: { alg: 'ES256', kid: 'FML385PGPZ', typ: 'JWT' },
  });
}

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
  if (!res.ok) {
    console.error(method, urlPath, res.status, JSON.stringify(json, null, 2));
    throw new Error(`${method} ${urlPath} ${res.status}`);
  }
  return json;
}

const list = await api(
  'GET',
  `/apps/${APP_ID}/reviewSubmissions?filter[state]=WAITING_FOR_REVIEW,IN_REVIEW,READY_FOR_REVIEW&limit=10`,
);
const open = list.data ?? [];
if (!open.length) {
  console.log('Nenhuma revisão aberta para cancelar.');
  process.exit(0);
}

for (const sub of open) {
  console.log('Cancelando', sub.id, sub.attributes?.state);
  await api('PATCH', `/reviewSubmissions/${sub.id}`, {
    data: {
      type: 'reviewSubmissions',
      id: sub.id,
      attributes: { canceled: true },
    },
  });
  console.log('Cancelado.');
}

const versions = await api('GET', `/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=5`);
for (const v of versions.data ?? []) {
  console.log('Versão', v.attributes?.versionString, v.attributes?.appStoreState);
}
