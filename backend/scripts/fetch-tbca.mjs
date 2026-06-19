/**
 * Baixa a TBCA 7.3 direto do portal oficial (tbca.net.br).
 * Gera data/foods/tbca-source.jsonl no formato consumido por build-food-json.mjs.
 *
 * Uso:
 *   node scripts/fetch-tbca.mjs
 *   node scripts/fetch-tbca.mjs --probe          # 1 pagina + 3 alimentos
 *   node scripts/fetch-tbca.mjs --resume         # continua do arquivo parcial
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../data/foods");
const OUT_FILE = path.join(OUT_DIR, "tbca-source.jsonl");
const META_FILE = path.join(OUT_DIR, "tbca-fetch-meta.json");

const TBCA_VERSION = "7.3";
const TBCA_ORIGIN = "https://www.tbca.net.br";
const TBCA_BASE = `${TBCA_ORIGIN}/base-dados/`;
const LIST_URL = `${TBCA_BASE}composicao_alimentos.php`;
const DETAIL_URL = `${TBCA_BASE}int_composicao_alimentos.php`;

const CONCURRENCY = 8;
const RETRY_LIMIT = 3;
const RETRY_DELAY_MS = 1200;

const args = new Set(process.argv.slice(2));
const probeMode = args.has("--probe");
const resumeMode = args.has("--resume");

function stripTags(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url, attempt = 1) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "ClubeFlorescer-TBCA-Fetch/1.0 (+https://github.com/clubeflorescer)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    if (attempt >= RETRY_LIMIT) throw err;
    await sleep(RETRY_DELAY_MS * attempt);
    return fetchText(url, attempt + 1);
  }
}

function parseFoodListPage(html) {
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return [];

  const rows = [...tbodyMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const foods = [];

  for (const row of rows) {
    const rowHtml = row[1];
    const hrefMatch = rowHtml.match(/href=['"]([^'"]*int_composicao_alimentos\.php[^'"]*)['"]/i);
    const detailPath = hrefMatch?.[1]?.trim();
    if (!detailPath) continue;

    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) =>
      stripTags(match[1]),
    );
    if (cells.length < 4) continue;
    const codigo = cells[0];
    if (!/^[A-Z0-9]/i.test(codigo)) continue;
    foods.push({
      codigo,
      classe: cells[3] || null,
      detailPath,
    });
  }

  return foods;
}

function parseFoodDetailPage(html, codigo, classe) {
  const overviewMatch = html.match(/<h5[^>]*id=["']overview["'][^>]*>([\s\S]*?)<\/h5>/i);
  const overviewText = stripTags(overviewMatch?.[1] || "");
  let descricao = overviewText;
  const descParts = overviewText.split(/Descri[cç][aã]o:/i);
  if (descParts.length > 1) {
    descricao = descParts[1].split("<<")[0].trim();
  }
  descricao = descricao
    .replace(/&lt;{2}|&gt;{2}|&lt&lt|&gt&gt/gi, " << ")
    .split("<<")[0]
    .replace(/&lt;|&gt;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  const nutrientes = [];
  if (tableMatch) {
    const theadMatch = tableMatch[1].match(/<thead[^>]*>[\s\S]*?<tr[^>]*>([\s\S]*?)<\/tr>[\s\S]*?<\/thead>/i);
    const headerRow = theadMatch?.[1] || "";
    const headers = [...headerRow.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)]
      .slice(0, 3)
      .map((match) => stripTags(match[1]));

    const bodyMatch = tableMatch[1].match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    const bodyRows = bodyMatch ? [...bodyMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)] : [];

    for (const row of bodyRows) {
      const values = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
        .slice(0, 3)
        .map((match) => stripTags(match[1]));
      if (!values.length || !headers.length) continue;
      const entry = {};
      for (let index = 0; index < headers.length; index += 1) {
        if (headers[index]) entry[headers[index]] = values[index] ?? "";
      }
      if (entry.Componente) nutrientes.push(entry);
    }
  }

  return {
    codigo,
    classe,
    descricao: descricao || codigo,
    nutrientes,
  };
}

async function listAllFoods(maxPages = Infinity) {
  const merged = new Map();
  let page = 1;

  while (page <= maxPages) {
    const html = await fetchText(`${LIST_URL}?pagina=${page}`);
    const foods = parseFoodListPage(html);
    if (!foods.length) break;

    for (const food of foods) {
      merged.set(food.codigo, food);
    }

    console.log(`[TBCA] Pagina ${page}: +${foods.length} (total ${merged.size})`);
    page += 1;
    await sleep(120);
  }

  return [...merged.values()];
}

async function loadExistingCodes() {
  try {
    const raw = await fs.readFile(OUT_FILE, "utf8");
    const codes = new Set();
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed?.codigo) codes.add(parsed.codigo);
      } catch {
        // ignore malformed lines
      }
    }
    return codes;
  } catch {
    return new Set();
  }
}

async function fetchFoodDetails(foods, existingCodes) {
  const pending = foods.filter((food) => !existingCodes.has(food.codigo));
  if (!pending.length) return 0;

  await fs.mkdir(OUT_DIR, { recursive: true });
  let written = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < pending.length) {
      const food = pending[cursor];
      cursor += 1;
      const detailUrl = new URL(food.detailPath, TBCA_BASE).toString();
      const html = await fetchText(detailUrl);
      const record = parseFoodDetailPage(html, food.codigo, food.classe);
      if (!record.nutrientes.length) {
        console.warn(`[TBCA] Sem nutrientes: ${food.codigo}`);
        continue;
      }
      await fs.appendFile(OUT_FILE, `${JSON.stringify(record)}\n`, "utf8");
      written += 1;
      if (written % 50 === 0) {
        console.log(`[TBCA] Detalhes baixados: ${written}/${pending.length}`);
      }
      await sleep(80);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return written;
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`[TBCA] Iniciando fetch oficial v${TBCA_VERSION}`);

  if (!resumeMode && !probeMode) {
    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(OUT_FILE, "", "utf8");
  }

  const existingCodes = resumeMode || probeMode ? await loadExistingCodes() : new Set();
  const foods = await listAllFoods(probeMode ? 1 : Infinity);
  const targetFoods = probeMode ? foods.slice(0, 3) : foods;

  console.log(`[TBCA] Alimentos na listagem: ${foods.length}`);
  const downloaded = await fetchFoodDetails(targetFoods, existingCodes);

  const totalLines = (await loadExistingCodes()).size;
  const meta = {
    version: TBCA_VERSION,
    source: TBCA_ORIGIN,
    listEndpoint: LIST_URL,
    detailEndpoint: DETAIL_URL,
    fetchedAt: new Date().toISOString(),
    startedAt,
    listedFoods: foods.length,
    downloadedThisRun: downloaded,
    totalRecords: totalLines,
    probeMode,
    resumeMode,
  };

  await fs.writeFile(META_FILE, JSON.stringify(meta, null, 2), "utf8");
  console.log(`[TBCA] Concluido. Registros em ${OUT_FILE}: ${totalLines}`);
  console.log(`[TBCA] Meta: ${META_FILE}`);
}

main().catch((err) => {
  console.error("[TBCA] Falha:", err);
  process.exit(1);
});
