import { OpenAIClient, buildImageDataUrl } from "./openai.client";
import { getModelForTask } from "./model-config";
import type { LabelMacroBlock, LabelNutritionExtraction } from "../../types/label-analysis.types";

const llm = new OpenAIClient();

const EMPTY_MACROS = (): LabelMacroBlock => ({
  caloriesKcal: null,
  carbsG: null,
  proteinG: null,
  fatG: null,
  saturatedFatG: null,
  transFatG: null,
  fiberG: null,
  sodiumMg: null,
  addedSugarsG: null,
});

function buildExtractionPrompt(): string {
  return `Você extrai dados de rótulos alimentares brasileiros (ANVISA).

A tabela tem DUAS colunas de valores:
1. **100 g** (ou 100 ml): medida universal de comparação — NÃO é o que a pessoa come de uma vez.
2. **Porção de referência**: ex. "Porção: 60 g (1 unidade)" — é a coluna que importa para consumo real.

Retorne SOMENTE JSON válido (sem markdown):
{
  "readable": true,
  "servingLabel": "60 g (1 unidade)",
  "servingSizeG": 60,
  "perServing": {
    "caloriesKcal": 103,
    "carbsG": 10,
    "proteinG": 6,
    "fatG": 0.9,
    "saturatedFatG": 0.1,
    "transFatG": 0,
    "fiberG": 7,
    "sodiumMg": 233,
    "addedSugarsG": 0
  },
  "per100g": {
    "caloriesKcal": 171,
    "carbsG": 17,
    "proteinG": 10,
    "fatG": 1.4,
    "saturatedFatG": 0.2,
    "transFatG": 0,
    "fiberG": 11,
    "sodiumMg": 389,
    "addedSugarsG": 0
  },
  "productHint": "hambúrguer vegetal de grão-de-bico",
  "likelyProteinSource": true,
  "ingredientsPreview": "grão-de-bico orgânico, arroz integral..."
}

Regras CRÍTICAS:
- **perServing** = SOMENTE números da coluna da porção de referência (lado direito da tabela, alinhado à porção declarada no topo).
- **per100g** = SOMENTE números da coluna 100 g (referência; não misturar com perServing).
- Se proteína na porção é 6 g e na coluna 100 g é 10 g, perServing.proteinG = 6 e per100g.proteinG = 10.
- NUNCA coloque valor da coluna 100 g dentro de perServing.
- Valores **0** são válidos (ex.: 0 g carboidrato, 0 g proteína em margarina/manteiga) — use 0, não null.
- **readable: true** quando a porção de referência e a tabela nutricional estiverem legíveis (kcal + ao menos gordura, carboidrato ou proteína).
- A **lista de ingredientes é OPCIONAL**. NÃO marque readable:false só porque ingredientes não aparecem na foto.
- Só use readable:false se a **tabela nutricional** ou a **porção** estiverem realmente ilegíveis (borrão, corte, reflexo forte).
- Se tabela ou porção não forem legíveis: { "readable": false, "illegibleReason": "motivo curto" }
- likelyProteinSource: true se hambúrguer, carne, whey, barra proteica, substituto de carne, etc.`;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function hasMinimumServingData(perServing: LabelMacroBlock): boolean {
  if (perServing.caloriesKcal !== null && perServing.caloriesKcal >= 0) return true;
  const macroCount = [perServing.carbsG, perServing.proteinG, perServing.fatG].filter(
    (value) => value !== null,
  ).length;
  return macroCount >= 2;
}

function derivePerServingFromPer100g(
  per100g: LabelMacroBlock,
  servingSizeG: number,
): LabelMacroBlock {
  const factor = servingSizeG / 100;
  const scale = (value: number | null) =>
    value !== null ? round1(value * factor) : null;

  return {
    caloriesKcal: scale(per100g.caloriesKcal),
    carbsG: scale(per100g.carbsG),
    proteinG: scale(per100g.proteinG),
    fatG: scale(per100g.fatG),
    saturatedFatG: scale(per100g.saturatedFatG),
    transFatG: scale(per100g.transFatG),
    fiberG: scale(per100g.fiberG),
    sodiumMg: per100g.sodiumMg !== null ? Math.round(per100g.sodiumMg * factor) : null,
    addedSugarsG: scale(per100g.addedSugarsG),
  };
}

function buildReadableExtraction(
  data: Record<string, unknown>,
  perServing: LabelMacroBlock,
): LabelNutritionExtraction {
  return {
    readable: true,
    servingLabel: typeof data.servingLabel === "string" ? data.servingLabel : undefined,
    servingSizeG: toNumberOrNull(data.servingSizeG),
    perServing,
    per100g: data.per100g ? parseMacroBlock(data.per100g) : EMPTY_MACROS(),
    productHint: typeof data.productHint === "string" ? data.productHint : undefined,
    likelyProteinSource: data.likelyProteinSource === true,
    ingredientsPreview:
      typeof data.ingredientsPreview === "string" ? data.ingredientsPreview : undefined,
  };
}

function parseMacroBlock(raw: unknown): LabelMacroBlock {
  const block = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    caloriesKcal: toNumberOrNull(block.caloriesKcal),
    carbsG: toNumberOrNull(block.carbsG),
    proteinG: toNumberOrNull(block.proteinG),
    fatG: toNumberOrNull(block.fatG),
    saturatedFatG: toNumberOrNull(block.saturatedFatG),
    transFatG: toNumberOrNull(block.transFatG),
    fiberG: toNumberOrNull(block.fiberG),
    sodiumMg: toNumberOrNull(block.sodiumMg),
    addedSugarsG: toNumberOrNull(block.addedSugarsG),
  };
}

export function parseLabelExtractionJson(raw: string): LabelNutritionExtraction {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Não consegui ler a tabela nutricional. Tente outra foto mais nítida.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Resposta inválida ao ler o rótulo.");
  }

  const data = parsed as Record<string, unknown>;
  const servingSizeG = toNumberOrNull(data.servingSizeG);
  let perServing = parseMacroBlock(data.perServing);

  if (!hasMinimumServingData(perServing) && data.per100g && servingSizeG && servingSizeG > 0) {
    const derived = derivePerServingFromPer100g(parseMacroBlock(data.per100g), servingSizeG);
    if (hasMinimumServingData(derived)) {
      perServing = derived;
    }
  }

  if (data.readable === false) {
    if (hasMinimumServingData(perServing)) {
      return buildReadableExtraction(data, perServing);
    }
    return {
      readable: false,
      illegibleReason:
        typeof data.illegibleReason === "string"
          ? data.illegibleReason
          : "Tabela nutricional ou porção não legíveis",
    };
  }

  if (!hasMinimumServingData(perServing)) {
    return {
      readable: false,
      illegibleReason: "Não foi possível ler os valores da porção de referência",
    };
  }

  return buildReadableExtraction(data, perServing);
}

export function formatMacroLine(label: string, value: number | null, unit: string): string {
  if (value === null) return `${label}: não legível`;
  return `${label}: ${value} ${unit}`;
}

export function buildExtractedLabelFactsBlock(extraction: LabelNutritionExtraction): string {
  if (!extraction.readable || !extraction.perServing) return "";

  const s = extraction.perServing;
  const serving =
    extraction.servingLabel ||
    (extraction.servingSizeG ? `${extraction.servingSizeG} g` : "porção de referência");

  const lines = [
    "## Dados lidos do rótulo (OBRIGATÓRIO usar só a porção — ignore 100 g na classificação)",
    `Porção de referência: **${serving}**`,
    formatMacroLine("Calorias", s.caloriesKcal, "kcal"),
    formatMacroLine("Carboidratos", s.carbsG, "g"),
    formatMacroLine("Proteínas", s.proteinG, "g"),
    formatMacroLine("Gorduras totais", s.fatG, "g"),
    formatMacroLine("Fibras", s.fiberG, "g"),
    formatMacroLine("Sódio", s.sodiumMg, "mg"),
    formatMacroLine("Açúcares adicionados", s.addedSugarsG, "g"),
  ];

  if (extraction.productHint) lines.push(`Tipo de produto: ${extraction.productHint}`);
  if (extraction.likelyProteinSource) {
    lines.push("Uso provável: fonte de proteína na refeição (aplicar regra proteica na PORÇÃO acima).");
  }
  if (extraction.ingredientsPreview) {
    lines.push(`Ingredientes (início): ${extraction.ingredientsPreview}`);
  }

  if (extraction.per100g) {
    const p100 = extraction.per100g;
    lines.push(
      "",
      "(Referência apenas — NÃO usar na classificação nem no Por quê: coluna 100 g: " +
        `P ${p100.proteinG ?? "?"} g, C ${p100.carbsG ?? "?"} g, G ${p100.fatG ?? "?"} g)`,
    );
  }

  lines.push(
    "",
    "ERRO GRAVE se você citar no Por quê valores da coluna 100 g como se fossem da porção.",
    'Exemplo de erro: dizer "60 g tem 10 g proteína" quando 10 g é da coluna 100 g e a porção tem 6 g.',
  );

  return lines.join("\n");
}

export async function extractLabelNutritionFromImage(
  buffer: Buffer,
  mimeType: string,
): Promise<LabelNutritionExtraction> {
  if (!llm.isEnabled()) {
    throw new Error("Leitura de rótulo requer OpenAI configurada no servidor.");
  }

  const model = getModelForTask("image");
  const dataUrl = buildImageDataUrl(buffer, mimeType);

  const completion = await llm.complete({
    messages: [
      { role: "system", content: buildExtractionPrompt() },
      {
        role: "user",
        content: [
          { type: "text", text: "Extraia porção e tabela nutricional. Separe perServing e per100g." },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
        ],
      },
    ],
    model,
    temperature: 0,
    maxTokens: 900,
    responseFormat: { type: "json_object" },
  });

  if (!completion.content) {
    throw new Error("Não consegui ler o rótulo. Envie foto mais nítida da tabela nutricional.");
  }

  return parseLabelExtractionJson(completion.content);
}
