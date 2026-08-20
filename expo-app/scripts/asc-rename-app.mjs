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

const infos = await api('GET', `/apps/${APP_ID}/appInfos`);
for (const info of infos.data ?? []) {
  const locs = await api('GET', `/appInfos/${info.id}/appInfoLocalizations`);
  for (const loc of locs.data ?? []) {
    console.log(info.attributes?.appStoreState, loc.attributes?.locale, loc.attributes?.name);
    if (loc.attributes?.locale === 'en-US' && loc.attributes?.name === 'Florescer') {
      await api('PATCH', `/appInfoLocalizations/${loc.id}`, {
        data: {
          type: 'appInfoLocalizations',
          id: loc.id,
          attributes: { name: 'Clube Florescer' },
        },
      });
      console.log('  revertido en-US para Clube Florescer');
    }
  }
}
