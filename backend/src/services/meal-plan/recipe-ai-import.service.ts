import { randomUUID } from "crypto";
import { OpenAIClient, buildImageDataUrl } from "../bella/openai.client";
import { getModelForTask } from "../bella/model-config";
import { extractPdfText } from "../bella/pdf-extractor";
import {
  processPdfBlocksSequentially,
  splitPlainTextIntoBlocks,
  type PdfTextBlock,
} from "../ai/pdf-block-reader";
import { matchFoodCandidatesBatch } from "./meal-plan-food-enricher";
import type { MealPlanRecipeIngredient } from "../../types/meal-plan-recipe.types";

const llm = new OpenAIClient();

export type RecipeImportMatchStatus = "matched" | "review" | "unmatched";

export type RecipeImportIngredient = MealPlanRecipeIngredient & {
  matchStatus?: RecipeImportMatchStatus;
  matchedFoodName?: string | null;
};

export type RecipeImportDraft = {
  title: string;
  servingsLabel: string;
  prepMinutes: number | null;
  steps: string;
  ingredients: RecipeImportIngredient[];
};

const RECIPE_JSON_SCHEMA = `{
  "title": "string",
  "servingsLabel": "string",
  "prepMinutes": "number | null",
  "steps": "string",
  "ingredients": [
    {
      "name": "string",
      "amount": "string",
      "unit": "string",
      "grams": "number | null"
    }
  ]
}`;

function normalizeText(value: unknown, max: number): string {
  return String(value || "").trim().slice(0, max);
}

function numOrNull(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function buildParsePrompt(sourceLabel: string, content: string, partial = false): string {
  const partialRule = partial
    ? "Extraia SOMENTE ingredientes e passos visíveis neste trecho. Se não houver receita aqui, retorne ingredients []."
    : "Extraia a receita completa deste trecho.";

  return `Você extrai receitas culinárias para nutricionistas do Clube Florescer.
Analise ${sourceLabel} e retorne SOMENTE JSON válido (sem markdown) neste formato:
${RECIPE_JSON_SCHEMA}

Regras:
- ${partialRule}
- Extraia título, porções (servingsLabel, ex.: "4 porções", "1 prato"), tempo de preparo em minutos (prepMinutes), ingredientes com quantidade e unidade, e modo de preparo (steps).
- Ingredientes: use nomes que existam na base TBCA/TACO quando possível (ex.: "Ovo, de galinha, inteiro, cru", "Banana, prata, crua").
- amount e unit separados (ex.: amount "2", unit "unidades"; amount "200", unit "g").
- Estime grams quando fizer sentido (ex.: 1 ovo ≈ 50g, 1 banana média ≈ 80g).
- Não invente ingredientes que não apareçam na receita.
- steps em texto corrido com quebras de linha entre passos.
- Se não encontrar receita, retorne title vazio e ingredients [].

Conteúdo:
---
${content}
---`;
}

async function parseRecipeFromText(text: string, sourceLabel: string): Promise<RecipeImportDraft> {
  const blocks = splitPlainTextIntoBlocks(text, "Trecho da receita");

  if (blocks.length <= 1) {
    return parseRecipeBlock(blocks[0] || { index: 0, label: sourceLabel, text }, sourceLabel, false);
  }

  const partials = await processPdfBlocksSequentially(blocks, (block) =>
    parseRecipeBlock(block, block.label, true),
  );

  return mergeRecipePartials(partials);
}

async function parseRecipeBlock(
  block: PdfTextBlock,
  sourceLabel: string,
  partial: boolean,
): Promise<RecipeImportDraft> {
  const result = await llm.complete({
    model: getModelForTask("pdf"),
    messages: [{ role: "user", content: buildParsePrompt(sourceLabel, block.text, partial) }],
    temperature: 0.1,
    maxTokens: 4000,
    responseFormat: { type: "json_object" },
  });

  const raw = String(result.content || "")
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  return normalizeParsedRecipe(JSON.parse(raw));
}

function mergeRecipePartials(partials: RecipeImportDraft[]): RecipeImportDraft {
  let title = "";
  let servingsLabel = "1 porção";
  let prepMinutes: number | null = null;
  const steps: string[] = [];
  const ingredientMap = new Map<string, MealPlanRecipeIngredient>();

  for (const partial of partials) {
    if (!title && partial.title && partial.title !== "Receita importada") title = partial.title;
    if (partial.servingsLabel) servingsLabel = partial.servingsLabel;
    if (partial.prepMinutes != null) prepMinutes = partial.prepMinutes;
    if (partial.steps) steps.push(partial.steps);

    for (const ingredient of partial.ingredients) {
      const key = `${ingredient.name}|${ingredient.amount}|${ingredient.unit}`.toLowerCase();
      if (!ingredientMap.has(key)) ingredientMap.set(key, ingredient);
    }
  }

  return {
    title: title || "Receita importada",
    servingsLabel,
    prepMinutes,
    steps: steps.filter(Boolean).join("\n\n"),
    ingredients: [...ingredientMap.values()],
  };
}

async function parseRecipeFromImage(buffer: Buffer, mimeType: string): Promise<RecipeImportDraft> {
  const dataUrl = buildImageDataUrl(buffer, mimeType);
  const result = await llm.complete({
    model: getModelForTask("image"),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: buildParsePrompt("a imagem da receita", "Veja a imagem anexada.") },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
        ],
      },
    ],
    temperature: 0.1,
    maxTokens: 4000,
    responseFormat: { type: "json_object" },
  });

  const raw = String(result.content || "")
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  return normalizeParsedRecipe(JSON.parse(raw));
}

function normalizeParsedRecipe(parsed: unknown): RecipeImportDraft {
  const row = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
  const ingredientsRaw = Array.isArray(row.ingredients) ? row.ingredients : [];

  const ingredients: MealPlanRecipeIngredient[] = ingredientsRaw
    .map((entry) => {
      const item = entry as Record<string, unknown>;
      const name = normalizeText(item.name, 160);
      if (!name) return null;
      return {
        id: randomUUID(),
        name,
        amount: normalizeText(item.amount, 24) || "1",
        unit: normalizeText(item.unit, 40) || "unidade",
        grams: numOrNull(item.grams),
        foodId: null,
        foodSource: null,
        per100g: null,
      } satisfies MealPlanRecipeIngredient;
    })
    .filter(Boolean) as MealPlanRecipeIngredient[];

  return {
    title: normalizeText(row.title, 160) || "Receita importada",
    servingsLabel: normalizeText(row.servingsLabel, 80) || "1 porção",
    prepMinutes: numOrNull(row.prepMinutes),
    steps: normalizeText(row.steps, 12000),
    ingredients: ingredients.length ? ingredients : [],
  };
}

function tokenizeName(value: string): string[] {
  return normalizeText(value, 160)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[\s,/]+/)
    .filter((token) => token.length > 2);
}

function resolveMatchStatus(
  ingredientName: string,
  matched: { name: string; displayName?: string; per100g?: { caloriesKcal?: number | null } | null } | null,
): RecipeImportMatchStatus {
  if (!matched?.per100g?.caloriesKcal && matched?.per100g?.caloriesKcal !== 0) return "unmatched";

  const queryTokens = tokenizeName(ingredientName);
  const matchedLabel = matched.displayName || matched.name;
  const matchedTokens = tokenizeName(matchedLabel);
  if (!queryTokens.length) return "review";

  const hits = queryTokens.filter((token) =>
    matchedTokens.some((candidate) => candidate.includes(token) || token.includes(candidate)),
  ).length;

  const ratio = hits / queryTokens.length;
  if (ratio >= 0.5) return "matched";
  return "review";
}

async function enrichIngredientsWithFoodBank(
  ingredients: MealPlanRecipeIngredient[],
): Promise<RecipeImportIngredient[]> {
  if (!ingredients.length) return [];

  const matches = await matchFoodCandidatesBatch(
    ingredients.map((item) => ({ key: item.id, name: item.name })),
    8,
  );
  const matchMap = new Map(matches.map((row) => [row.key, row.item]));

  return ingredients.map((ingredient) => {
    const food = matchMap.get(ingredient.id);
    if (!food) {
      return {
        ...ingredient,
        matchStatus: "unmatched" as const,
        matchedFoodName: null,
      };
    }

    const matchStatus = resolveMatchStatus(ingredient.name, food);
    return {
      ...ingredient,
      foodId: food.id,
      foodSource: food.source,
      per100g: {
        caloriesKcal: food.per100g?.caloriesKcal ?? null,
        proteinG: food.per100g?.proteinG ?? null,
        carbsG: food.per100g?.carbsG ?? null,
        fatG: food.per100g?.fatG ?? null,
        fiberG: food.per100g?.fiberG ?? null,
        sodiumMg: food.per100g?.sodiumMg ?? null,
      },
      matchedFoodName: food.displayName || food.name,
      matchStatus,
    };
  });
}

export class RecipeAiImportService {
  async importFromFile(file: {
    buffer: Buffer;
    originalname?: string;
    mimetype?: string;
  }): Promise<{ draft: RecipeImportDraft; sourceType: "pdf" | "image"; warnings: string[] }> {
    if (!llm.isEnabled()) {
      throw new Error("Importação indisponível. Configure OPENAI_API_KEY no servidor.");
    }

    if (!file?.buffer?.length) {
      throw new Error("Arquivo vazio.");
    }

    const mime = String(file.mimetype || "").split(";")[0].trim().toLowerCase();
    const warnings: string[] = [];
    let parsed: RecipeImportDraft;
    let sourceType: "pdf" | "image";

    if (mime === "application/pdf" || /\.pdf$/i.test(String(file.originalname || ""))) {
      const extracted = await extractPdfText(file.buffer, file.originalname || "receita.pdf");
      if (extracted.truncated) {
        warnings.push("O PDF foi truncado por tamanho. Confira se nada ficou faltando.");
      }
      parsed = await parseRecipeFromText(extracted.text, "o texto do PDF");
      sourceType = "pdf";
    } else if (mime.startsWith("image/")) {
      parsed = await parseRecipeFromImage(file.buffer, mime);
      sourceType = "image";
    } else {
      throw new Error("Formato não suportado. Envie PDF ou imagem.");
    }

    if (!parsed.ingredients.length) {
      throw new Error("Não encontramos ingredientes na receita. Tente outra foto ou PDF mais nítido.");
    }

    const ingredients = await enrichIngredientsWithFoodBank(parsed.ingredients);
    const unmatched = ingredients.filter((item) => item.matchStatus === "unmatched").length;
    const review = ingredients.filter((item) => item.matchStatus === "review").length;

    if (unmatched) {
      warnings.push(`${unmatched} ingrediente(s) sem correspondência na base TBCA/TACO.`);
    }
    if (review) {
      warnings.push(`${review} ingrediente(s) precisam de conferência manual.`);
    }

    return {
      draft: { ...parsed, ingredients },
      sourceType,
      warnings,
    };
  }
}

export const recipeAiImportService = new RecipeAiImportService();
