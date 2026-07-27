/**
 * Baixa TACO (CSV atualizado) e importa no Postgres.
 * Não exige tbca-source.jsonl.
 *
 * Uso: node scripts/import-taco-only.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "data", "foods");
const tacoCsvUrl =
  "https://raw.githubusercontent.com/brolesi/taco/main/data/processed/taco/taco_composicao.csv";

function parseBrNumber(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw || raw.toUpperCase() === "NA" || raw === "Tr") return null;
  if (/^\d+\.\d+$/.test(raw)) {
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  }
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

  const sourceCode = String(get("numero_alimento") || get("Número do Alimento") || "").trim();
  const name = String(get("descricao") || get("Descrição dos alimentos") || "").trim();
  const category = String(get("categoria") || get("Categoria do alimento") || "").trim() || null;

  const nutrientsPer100g = {
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

const csvRes = await fetch(tacoCsvUrl);
if (!csvRes.ok) throw new Error(`Falha ao baixar TACO: ${csvRes.status}`);
const csv = await csvRes.text();
const lines = csv.split(/\r?\n/).filter(Boolean);
const headers = parseCsvLine(lines[0]);
const items = lines
  .slice(1)
  .map((line) => buildTacoRecord(parseCsvLine(line), headers))
  .filter((item) => item.sourceCode && item.name);

await fs.mkdir(outDir, { recursive: true });
const tacoPath = path.join(outDir, "taco.json");
await fs.writeFile(tacoPath, JSON.stringify(items, null, 2), "utf8");
console.log(`[TACO] Gerado ${tacoPath} (${items.length} itens)`);

const result = spawnSync("npx", ["ts-node", "scripts/import-taco-only.ts"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
if (result.status !== 0) process.exit(result.status || 1);
