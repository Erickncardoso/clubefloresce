#!/usr/bin/env node
/**
 * Verifica registros DNS de e-mail (SPF, DKIM, DMARC, BIMI).
 *
 * Uso:
 *   node backend/scripts/check-email-dns.mjs
 *   node backend/scripts/check-email-dns.mjs --domain nutrisabellajardim.com.br
 */

import dns from "node:dns/promises";

const domain = readArg("--domain") || "nutrisabellajardim.com.br";
const logoUrl =
  readArg("--logo-url") ||
  "https://app.nutrisabellajardim.com.br/bimi/clube-florescer.svg";

const checks = [];

async function main() {
  console.log(`\nVerificação DNS de e-mail — ${domain}\n`);

  await checkTxt(domain, "SPF (raiz)", (records) =>
    records.some((r) => r.startsWith("v=spf1") && r.includes("amazonses.com")),
  );

  await checkTxt(`resend._domainkey.${domain}`, "DKIM Resend", (records) =>
    records.some((r) => r.includes("p=") || r.includes("v=DKIM1")),
  );

  await checkTxt(`_dmarc.${domain}`, "DMARC", (records) => {
    const dmarc = records.find((r) => r.startsWith("v=DMARC1"));
    if (!dmarc) return false;
    const policy = /;\s*p=([^;]+)/i.exec(dmarc)?.[1]?.trim();
    checks.push(`   Política DMARC: p=${policy || "?"}`);
    if (policy === "none") {
      checks.push("   ⚠ BIMI no Gmail exige p=quarantine ou p=reject");
    }
    return true;
  });

  await checkTxt(`default._bimi.${domain}`, "BIMI", (records) =>
    records.some((r) => r.startsWith("v=BIMI1") && r.includes(logoUrl)),
  );

  await checkLogoUrl(logoUrl);

  console.log("\n--- Resumo ---");
  for (const line of checks) console.log(line);
  console.log("");
}

async function checkTxt(name, label, predicate) {
  try {
    const rows = await dns.resolveTxt(name);
    const flat = rows.map((parts) => parts.join("")).map(normalizeTxt);
    const ok = flat.length > 0 && predicate(flat);
    console.log(`${ok ? "✔" : "✗"} ${label} (${name})`);
    if (!ok && flat.length > 0) {
      flat.forEach((r) => console.log(`   ${truncate(r, 120)}`));
    } else if (flat.length === 0) {
      console.log("   Registro não encontrado");
    }
    checks.push(`${ok ? "✔" : "✗"} ${label}`);
  } catch {
    console.log(`✗ ${label} (${name})`);
    console.log("   Registro não encontrado ou DNS indisponível");
    checks.push(`✗ ${label}`);
  }
}

async function checkLogoUrl(url) {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    const contentType = String(res.headers.get("content-type") || "");
    const body = res.ok ? (await res.text()).trimStart() : "";
    const looksLikeSvg =
      contentType.includes("svg") ||
      body.startsWith("<?xml") ||
      body.startsWith("<svg");
    const ok = res.ok && looksLikeSvg;
    console.log(`${ok ? "✔" : "✗"} Logo BIMI acessível (${url})`);
    if (!ok) {
      console.log(`   HTTP ${res.status} — content-type: ${contentType || "(vazio)"}`);
      if (res.ok && !looksLikeSvg) {
        console.log("   A URL responde, mas não parece SVG (deploy do arquivo pendente?)");
      }
    }
    checks.push(`${ok ? "✔" : "✗"} Logo BIMI HTTPS`);
  } catch (error) {
    console.log(`✗ Logo BIMI acessível (${url})`);
    console.log(`   ${error.message}`);
    checks.push("✗ Logo BIMI HTTPS");
  }
}

function readArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function normalizeTxt(value) {
  return value.replace(/\s+/g, "").trim();
}

function truncate(value, max) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
