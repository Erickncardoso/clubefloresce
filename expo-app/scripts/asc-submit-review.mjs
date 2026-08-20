#!/usr/bin/env node
/**
 * Preenche metadados da versão 1.0.1, associa build 22 e envia para revisão Apple.
 * Uso: node scripts/asc-submit-review.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const KEY_ID = 'FML385PGPZ';
const ISSUER_ID = 'f800fd31-89d4-4b7d-af7d-20f800cbd63e';
const KEY_PATH = path.join(ROOT, 'credentials/asc-api-key.p8');
const APP_ID = '6795381418';
const VERSION = '1.0.1';
const BUILD_NUMBER = '22';

const WHATS_NEW =
  'O que há de novo:\n\n• App mais estável e rápido ao abrir\n• Fotografe sua refeição com a câmera — a Bella analisa o prato na hora\n• Notificações com foto e botões de atalho\n• Acompanhe sua meta de água na Live Activity (iOS 16.2+)\n• Melhorias gerais para deixar seu dia a dia mais leve';

const REVIEW_NOTES = `CORREÇÃO CRÍTICA — prioridade: build 14 podia crashar na abertura (módulo nativo de câmera ausente). Este binário corrige estabilidade, inclui câmera nativa (expo-camera) e Notification Service Extension para foto nas push + botões de atalho.

TESTAR CÂMERA: login review.full@clubeflorescer.app / AppleReview2026! → Início → card da refeição → ícone câmera → conceder permissão → preview ao vivo e captura. Galeria funciona no mesmo fluxo.

TESTAR PUSH COM IMAGEM/BOTÃO: o painel da nutricionista envia notificação com imagem e botão (Ver agora / Check-in / Bella). No iPhone a foto aparece no banner após conceder notificações.

USE A CONTA COMPLETA: review.full@clubeflorescer.app / AppleReview2026!

Conta preview (acesso limitado): review.limited@clubeflorescer.app / mesma senha. Onboarding já concluído.

MODELO DE NEGÓCIO (3.1.1): portal de paciente de consultório nutricional. Não há compra, preço ou pagamento no app iOS. O acesso completo é liberado manualmente pela nutricionista. Avatar (header) → Configurações → Meu acesso → Sincronizar. Sem links de checkout externo. Sem IAP.

CITAÇÕES DE SAÚDE (1.4.1): Avatar → Configurações → Fontes e referências (TBCA, TACO, Guia Alimentar MS, OMS, CFN, NIH). Também visível em Início, Dieta, Bella chat, Substituir alimento e Evolução.

Comunidade: menu ⋮ → Denunciar publicação ou Bloquear membro. Regras visíveis no topo do feed.

Exclusão de conta: Avatar → Configurações → Meu Perfil → Apagar minha conta.

Contato: contato@nutrisabellajardim.com.br`;

function signJwt() {
  const key = fs.readFileSync(KEY_PATH, 'utf8');
  return jwt.sign({}, key, {
    algorithm: 'ES256',
    expiresIn: '20m',
    issuer: ISSUER_ID,
    audience: 'appstoreconnect-v1',
    header: { alg: 'ES256', kid: KEY_ID, typ: 'JWT' },
  });
}

async function api(method, urlPath, body) {
  const token = signJwt();
  const res = await fetch(`https://api.appstoreconnect.apple.com/v1${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`ASC ${method} ${urlPath} → ${res.status}`);
    err.response = json;
    throw err;
  }
  return json;
}

async function getEditableVersion() {
  const states = [
    'PREPARE_FOR_SUBMISSION',
    'DEVELOPER_REJECTED',
    'REJECTED',
    'METADATA_REJECTED',
    'WAITING_FOR_REVIEW',
    'READY_FOR_SALE',
  ];
  const res = await api(
    'GET',
    `/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=20`,
  );
  const versions = res.data ?? [];
  let version = versions.find((v) => v.attributes?.versionString === VERSION);
  if (version) return version;

  console.log(`Criando versão App Store ${VERSION}…`);
  const created = await api('POST', '/appStoreVersions', {
    data: {
      type: 'appStoreVersions',
      attributes: {
        platform: 'IOS',
        versionString: VERSION,
      },
      relationships: {
        app: { data: { type: 'apps', id: APP_ID } },
      },
    },
  });
  return created.data;
}

async function findBuildId() {
  const res = await api(
    'GET',
    `/builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=20&include=preReleaseVersion`,
  );
  const builds = res.data ?? [];
  const match = builds.find((b) => {
    const pre = res.included?.find(
      (i) => i.type === 'preReleaseVersions' && i.id === b.relationships?.preReleaseVersion?.data?.id,
    );
    const versionString = pre?.attributes?.version ?? b.attributes?.version;
    return (
      String(b.attributes?.version) === BUILD_NUMBER
      || versionString === VERSION
    );
  });
  if (!match) {
    throw new Error(`Build ${BUILD_NUMBER} (${VERSION}) não encontrado no ASC ainda. Aguarde processamento Apple.`);
  }
  if (match.attributes?.processingState !== 'VALID') {
    console.warn(`Build state: ${match.attributes?.processingState} (continuando se possível)`);
  }
  return match.id;
}

async function attachBuild(versionId, buildId) {
  console.log(`Associando build ${buildId} à versão ${versionId}…`);
  await api('PATCH', `/appStoreVersions/${versionId}`, {
    data: {
      type: 'appStoreVersions',
      id: versionId,
      relationships: {
        build: { data: { type: 'builds', id: buildId } },
      },
    },
  });
}

async function updateWhatsNew(versionId) {
  const locs = await api('GET', `/appStoreVersions/${versionId}/appStoreVersionLocalizations`);
  for (const loc of locs.data ?? []) {
    const locale = loc.attributes?.locale;
    console.log(`Atualizando "O que há de novo" (${locale})…`);
    await api('PATCH', `/appStoreVersionLocalizations/${loc.id}`, {
      data: {
        type: 'appStoreVersionLocalizations',
        id: loc.id,
        attributes: { whatsNew: WHATS_NEW },
      },
    });
  }

  if (!(locs.data ?? []).some((l) => l.attributes?.locale === 'pt-BR')) {
    console.log('Criando localização pt-BR…');
    await api('POST', '/appStoreVersionLocalizations', {
      data: {
        type: 'appStoreVersionLocalizations',
        attributes: { locale: 'pt-BR', whatsNew: WHATS_NEW },
        relationships: {
          appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } },
        },
      },
    });
  }
}

async function updateReviewDetail(versionId) {
  const version = await api('GET', `/appStoreVersions/${versionId}?include=appStoreReviewDetail`);
  const detailRef = version.data?.relationships?.appStoreReviewDetail?.data;
  let detailId = detailRef?.id;

  if (!detailId) {
    console.log('Criando App Store Review Detail…');
    const created = await api('POST', '/appStoreReviewDetails', {
      data: {
        type: 'appStoreReviewDetails',
        attributes: {
          contactFirstName: 'Isabella',
          contactLastName: 'Jardim',
          contactEmail: 'contato@nutrisabellajardim.com.br',
          contactPhone: '+5511993270000',
          demoAccountName: 'review.full@clubeflorescer.app',
          demoAccountPassword: 'AppleReview2026!',
          demoAccountRequired: true,
          notes: REVIEW_NOTES,
        },
        relationships: {
          appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } },
        },
      },
    });
    detailId = created.data.id;
    return;
  }

  console.log('Atualizando notas para revisão…');
  await api('PATCH', `/appStoreReviewDetails/${detailId}`, {
    data: {
      type: 'appStoreReviewDetails',
      id: detailId,
      attributes: {
        contactFirstName: 'Isabella',
        contactLastName: 'Jardim',
        contactEmail: 'contato@nutrisabellajardim.com.br',
        contactPhone: '+5511993270000',
        demoAccountName: 'review.full@clubeflorescer.app',
        demoAccountPassword: 'AppleReview2026!',
        demoAccountRequired: true,
        notes: REVIEW_NOTES,
      },
    },
  });
}

async function submitForReview(versionId) {
  const version = await api('GET', `/appStoreVersions/${versionId}`);
  const state = version.data?.attributes?.appStoreState;
  if (state === 'WAITING_FOR_REVIEW' || state === 'IN_REVIEW') {
    console.log(`Versão já em revisão (${state}).`);
    return;
  }
  if (state === 'READY_FOR_SALE') {
    console.log('Versão já publicada na loja.');
    return;
  }

  console.log('Enviando para revisão da Apple (reviewSubmissions)…');
  const submission = await api('POST', '/reviewSubmissions', {
    data: {
      type: 'reviewSubmissions',
      relationships: {
        app: { data: { type: 'apps', id: APP_ID } },
      },
    },
  });
  const submissionId = submission.data.id;

  await api('POST', '/reviewSubmissionItems', {
    data: {
      type: 'reviewSubmissionItems',
      relationships: {
        reviewSubmission: { data: { type: 'reviewSubmissions', id: submissionId } },
        appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } },
      },
    },
  });

  await api('PATCH', `/reviewSubmissions/${submissionId}`, {
    data: {
      type: 'reviewSubmissions',
      id: submissionId,
      attributes: { submitted: true },
    },
  });
}

async function main() {
  console.log(`App Store Connect — preparando versão ${VERSION} / build ${BUILD_NUMBER}\n`);
  const version = await getEditableVersion();
  const versionId = version.id;
  const state = version.attributes?.appStoreState;
  console.log(`Versão ${VERSION} id=${versionId} state=${state}`);

  const buildId = await findBuildId();
  console.log(`Build encontrado: ${buildId}`);

  await attachBuild(versionId, buildId);
  await updateWhatsNew(versionId);
  await updateReviewDetail(versionId);
  await submitForReview(versionId);

  console.log(`\n✔ Concluído: versão ${VERSION} com build ${BUILD_NUMBER} enviada para revisão.`);
}

main().catch((err) => {
  console.error('\n✗ Falha:', err.message);
  if (err.response?.errors) {
    for (const e of err.response.errors) {
      console.error(`  - ${e.title}: ${e.detail}`);
    }
  } else if (err.response) {
    console.error(JSON.stringify(err.response, null, 2));
  }
  process.exit(1);
});
