/**
 * Baixa TACO (CSV) e TBCA (JSONL) e gera JSON normalizado em data/foods/.
 *
 * Uso: node scripts/build-food-json.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../data/foods");

const TACO_CSV_URL =
  "https://raw.githubusercontent.com/brolesi/taco/main/data/processed/taco/alimentos.csv";
const TBCA_SOURCE_FILE = path.join(OUT_DIR, "tbca-source.jsonl");
const TBCA_META_FILE = path.join(OUT_DIR, "tbca-fetch-meta.json");
const TBCA_VERSION = "7.3";
const TBCA_SOURCE_SITE = "https://www.tbca.net.br/";

function parseBrNumber(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw || raw.toUpperCase() === "NA" || raw === "Tr") return null;

  // Decimal inglês simples: 35.9, 2.5
  if (/^\d+\.\d+$/.test(raw)) {
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  }

  // Formato brasileiro: 1.234,56 ou 35,9
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s,/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function buildTacoRecord(row, headers) {
  const get = (name) => {
    const index = headers.indexOf(name);
    return index >= 0 ? row[index] ?? null : null;
  };

  const legacy = headers.includes("Descrição dos alimentos");
  const sourceCode = legacy
    ? String(get("Número do Alimento") || "").trim()
    : String(get("Número do Alimento") || get("numero_alimento") || "").trim();
  const name = legacy
    ? String(get("Descrição dos alimentos") || "").trim()
    : String(get("Descrição dos alimentos") || get("descricao") || "").trim();
  const category = legacy
    ? String(get("Categoria do alimento") || "").trim() || null
    : String(get("Categoria do alimento") || get("categoria") || "").trim() || null;

  const nutrientsPer100g = legacy
    ? {
        moistureG: parseBrNumber(get("Umidade....")),
        energyKcal: parseBrNumber(get("Energia..kcal.")),
        energyKj: parseBrNumber(get("Energia..kJ.")),
        proteinG: parseBrNumber(get("Proteína..g.")),
        fatG: parseBrNumber(get("Lipídeos..g.")),
        cholesterolMg: parseBrNumber(get("Colesterol..mg.")),
        carbsG: parseBrNumber(get("Carboidrato..g.")),
        fiberG: parseBrNumber(get("Fibra.Alimentar..g.")),
        ashG: parseBrNumber(get("Cinzas..g.")),
        calciumMg: parseBrNumber(get("Cálcio..mg.")),
        magnesiumMg: parseBrNumber(get("Magnésio..mg.")),
        manganeseMg: parseBrNumber(get("Manganês..mg.")),
        phosphorusMg: parseBrNumber(get("Fósforo..mg.")),
        ironMg: parseBrNumber(get("Ferro..mg.")),
        sodiumMg: parseBrNumber(get("Sódio..mg.")),
        potassiumMg: parseBrNumber(get("Potássio..mg.")),
        copperMg: parseBrNumber(get("Cobre..mg.")),
        zincMg: parseBrNumber(get("Zinco..mg.")),
        retinolMcg: parseBrNumber(get("Retinol..mcg.")),
        reMcg: parseBrNumber(get("RE..mcg.")),
        raeMcg: parseBrNumber(get("RAE..mcg.")),
        thiamineMg: parseBrNumber(get("Tiamina..mg.")),
        riboflavinMg: parseBrNumber(get("Riboflavina..mg.")),
        pyridoxineMg: parseBrNumber(get("Piridoxina..mg.")),
        niacinMg: parseBrNumber(get("Niacina..mg.")),
        vitaminCMg: parseBrNumber(get("Vitamina.C..mg.")),
      }
    : {
        moistureG: parseBrNumber(get("umidade_pct")),
        energyKcal: parseBrNumber(get("energia_kcal")),
        energyKj: parseBrNumber(get("energia_kj")),
        proteinG: parseBrNumber(get("proteina_g")),
        fatG: parseBrNumber(get("lipideos_g")),
        cholesterolMg: parseBrNumber(get("colesterol_mg")),
        carbsG: parseBrNumber(get("carboidrato_g")),
        fiberG: parseBrNumber(get("fibra_g")),
        ashG: parseBrNumber(get("cinzas_g")),
        calciumMg: parseBrNumber(get("calcio_mg")),
        magnesiumMg: parseBrNumber(get("magnesio_mg")),
        manganeseMg: parseBrNumber(get("manganes_mg")),
        phosphorusMg: parseBrNumber(get("fosforo_mg")),
        ironMg: parseBrNumber(get("ferro_mg")),
        sodiumMg: parseBrNumber(get("sodio_mg")),
        potassiumMg: parseBrNumber(get("potassio_mg")),
        copperMg: parseBrNumber(get("cobre_mg")),
        zincMg: parseBrNumber(get("zinco_mg")),
        retinolMcg: parseBrNumber(get("retinol_mcg")),
        reMcg: parseBrNumber(get("RE_mcg")),
        raeMcg: parseBrNumber(get("RAE_mcg")),
        thiamineMg: parseBrNumber(get("tiamina_mg")),
        riboflavinMg: parseBrNumber(get("riboflavina_mg")),
        pyridoxineMg: parseBrNumber(get("piridoxina_mg")),
        niacinMg: parseBrNumber(get("niacina_mg")),
        vitaminCMg: parseBrNumber(get("vitamina_c_mg")),
      };

  return {
    source: "TACO",
    sourceCode,
    name,
    category,
    nutrientsPer100g,
    caloriesKcal: nutrientsPer100g.energyKcal,
    proteinG: nutrientsPer100g.proteinG,
    carbsG: nutrientsPer100g.carbsG,
    fatG: nutrientsPer100g.fatG,
    fiberG: nutrientsPer100g.fiberG,
    sodiumMg: nutrientsPer100g.sodiumMg,
    searchText: normalizeSearchText(`${name} ${category || ""}`),
  };
}

function findTbcaNutrient(nutrientes, component, unit) {
  const hit = nutrientes.find(
    (item) =>
      String(item.Componente || "").trim() === component &&
      String(item.Unidades || "").trim() === unit,
  );
  return parseBrNumber(hit?.["Valor por 100g"]);
}

function cleanTbcaDescription(descricao) {
  return String(descricao || "")
    .replace(/&lt;{2}|&gt;{2}|&lt&lt|&gt&gt/gi, " << ")
    .split("<<")[0]
    .replace(/&lt;|&gt;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildTbcaRecord(raw) {
  const nutrientes = Array.isArray(raw.nutrientes) ? raw.nutrientes : [];
  const nutrientsPer100g = {
    energyKcal: findTbcaNutrient(nutrientes, "Energia", "kcal"),
    energyKj: findTbcaNutrient(nutrientes, "Energia", "kJ"),
    moistureG: findTbcaNutrient(nutrientes, "Umidade", "g"),
    carbsTotalG: findTbcaNutrient(nutrientes, "Carboidrato total", "g"),
    carbsAvailableG: findTbcaNutrient(nutrientes, "Carboidrato disponível", "g"),
    proteinG: findTbcaNutrient(nutrientes, "Proteína", "g"),
    fatG: findTbcaNutrient(nutrientes, "Lipídios", "g"),
    fiberG: findTbcaNutrient(nutrientes, "Fibra alimentar", "g"),
    alcoholG: findTbcaNutrient(nutrientes, "Álcool", "g"),
    ashG: findTbcaNutrient(nutrientes, "Cinzas", "g"),
    cholesterolMg: findTbcaNutrient(nutrientes, "Colesterol", "mg"),
    saturatedFatG: findTbcaNutrient(nutrientes, "Ácidos graxos saturados", "g"),
    monounsaturatedFatG: findTbcaNutrient(nutrientes, "Ácidos graxos monoinsaturados", "g"),
    polyunsaturatedFatG: findTbcaNutrient(nutrientes, "Ácidos graxos poliinsaturados", "g"),
    transFatG: findTbcaNutrient(nutrientes, "Ácidos graxos trans", "g"),
    calciumMg: findTbcaNutrient(nutrientes, "Cálcio", "mg"),
    ironMg: findTbcaNutrient(nutrientes, "Ferro", "mg"),
    sodiumMg: findTbcaNutrient(nutrientes, "Sódio", "mg"),
    magnesiumMg: findTbcaNutrient(nutrientes, "Magnésio", "mg"),
    phosphorusMg: findTbcaNutrient(nutrientes, "Fósforo", "mg"),
    potassiumMg: findTbcaNutrient(nutrientes, "Potássio", "mg"),
    zincMg: findTbcaNutrient(nutrientes, "Zinco", "mg"),
    copperMg: findTbcaNutrient(nutrientes, "Cobre", "mg"),
    seleniumMcg: findTbcaNutrient(nutrientes, "Selênio", "mcg"),
    vitaminARaeMcg: findTbcaNutrient(nutrientes, "Vitamina A (RAE)", "mcg"),
    vitaminDMcg: findTbcaNutrient(nutrientes, "Vitamina D", "mcg"),
    thiamineMg: findTbcaNutrient(nutrientes, "Tiamina", "mg"),
    riboflavinMg: findTbcaNutrient(nutrientes, "Riboflavina", "mg"),
    niacinMg: findTbcaNutrient(nutrientes, "Niacina", "mg"),
    vitaminCMg: findTbcaNutrient(nutrientes, "Vitamina C", "mg"),
  };

  const sourceCode = String(raw.codigo || "").trim();
  const name = cleanTbcaDescription(raw.descricao) || String(raw.descricao || "").trim();
  const category = String(raw.classe || "").trim() || null;

  return {
    source: "TBCA",
    sourceCode,
    name,
    category,
    nutrientsPer100g,
    rawNutrients: nutrientes,
    caloriesKcal: nutrientsPer100g.energyKcal,
    proteinG: nutrientsPer100g.proteinG,
    carbsG: nutrientsPer100g.carbsAvailableG ?? nutrientsPer100g.carbsTotalG,
    fatG: nutrientsPer100g.fatG,
    fiberG: nutrientsPer100g.fiberG,
    sodiumMg: nutrientsPer100g.sodiumMg,
    searchText: normalizeSearchText(`${name} ${category || ""}`),
  };
}

async function downloadText(url) {
  console.log(`Baixando ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar ${url}: ${res.status}`);
  return res.text();
}

async function buildTacoJson() {
  const csv = await downloadText(TACO_CSV_URL);
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]);
  const items = lines.slice(1).map((line) => buildTacoRecord(parseCsvLine(line), headers));
  return items.filter((item) => item.sourceCode && item.name);
}

async function buildTbcaJson() {
  let meta = null;
  try {
    meta = JSON.parse(await fs.readFile(TBCA_META_FILE, "utf8"));
  } catch {
    // optional
  }

  let rawText = "";
  try {
    rawText = await fs.readFile(TBCA_SOURCE_FILE, "utf8");
  } catch {
    throw new Error(
      "Arquivo tbca-source.jsonl não encontrado. Rode primeiro: npm run foods:fetch-tbca",
    );
  }

  const items = [];
  for (const line of rawText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      items.push(buildTbcaRecord(JSON.parse(trimmed)));
    } catch (err) {
      console.warn("Linha TBCA ignorada:", err instanceof Error ? err.message : err);
    }
  }

  const normalized = items.filter((item) => item.sourceCode && item.name);
  if (!normalized.length) {
    throw new Error("Nenhum alimento TBCA válido em tbca-source.jsonl.");
  }

  console.log(
    `TBCA v${meta?.version || TBCA_VERSION}: ${normalized.length} itens (fonte: ${TBCA_SOURCE_SITE})`,
  );
  return normalized;
}

async function writeJson(fileName, data) {
  const filePath = path.join(OUT_DIR, fileName);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
  const countLabel = Array.isArray(data) ? `${data.length} itens` : "ok";
  console.log(`Gerado ${filePath} (${countLabel})`);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const taco = await buildTacoJson();
  const tbca = await buildTbcaJson();
  await writeJson("taco.json", taco);
  await writeJson("tbca.json", tbca);
  await writeJson("catalog-meta.json", {
    generatedAt: new Date().toISOString(),
    totals: { taco: taco.length, tbca: tbca.length, all: taco.length + tbca.length },
    sources: {
      TACO: { count: taco.length, url: TACO_CSV_URL },
      TBCA: {
        version: TBCA_VERSION,
        count: tbca.length,
        site: TBCA_SOURCE_SITE,
        file: "tbca-source.jsonl",
      },
    },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
