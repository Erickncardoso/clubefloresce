import { OpenAIClient } from "../bella/openai.client";
import { getModelForTask } from "../bella/model-config";
import type { ParsedMeal, ParsedMealPlan } from "../../types/meal-plan.types";
import {
  processPdfBlocksSequentially,
  splitPlainTextIntoBlocks,
  type PdfTextBlock,
} from "../ai/pdf-block-reader";
import { sanitizeMealPlanSubstitutions } from "./meal-plan-text-sanitize";

const llm = new OpenAIClient();

const MEAL_PLAN_JSON_SCHEMA = `{
  "title": "string",
  "patientName": "string | null",
  "prescribedAt": "string | null",
  "meals": [
    {
      "id": "string",
      "time": "HH:MM",
      "label": "string",
      "items": [
        {
          "key": "string",
          "name": "string",
          "amount": "number | null",
          "unit": "string",
          "grams": "number | null",
          "ml": "number | null",
          "display": "string",
          "substitutions": []
        }
      ]
    }
  ]
}`;

type PartialMealPlan = Omit<ParsedMealPlan, "fileName" | "parserSource">;

function buildBlockPrompt(blockLabel: string, text: string, isPartial: boolean): string {
  const partialHint = isPartial
    ? `Este é apenas ${blockLabel} de um PDF maior. Extraia SOMENTE as refeições presentes neste trecho.`
    : "Extraia o planejamento alimentar completo deste trecho.";

  return `Extraia refeições do texto abaixo e retorne SOMENTE JSON válido (sem markdown) neste formato:
${MEAL_PLAN_JSON_SCHEMA}

Regras:
- ${partialHint}
- Preserve horários (time) e nomes das refeições (label).
- Cada item deve ter "display" com a linha completa do alimento.
- Inclua substituições em "substitutions" quando houver "Opções de substituição".
- Não invente alimentos que não estejam no trecho.
- Use ids em slug únicos (ex.: "0615-cafe-da-manha").
- Se este trecho não tiver refeições, retorne "meals": [].

Trecho (${blockLabel}):
---
${text}
---`;
}

async function parseMealPlanBlock(
  block: PdfTextBlock,
  isPartial: boolean,
): Promise<PartialMealPlan> {
  const result = await llm.complete({
    model: getModelForTask("pdf"),
    messages: [{ role: "user", content: buildBlockPrompt(block.label, block.text, isPartial) }],
    temperature: 0.1,
    maxTokens: 6000,
    responseFormat: { type: "json_object" },
  });

  const raw = String(result.content || "")
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(raw) as PartialMealPlan;
  if (!Array.isArray(parsed.meals)) parsed.meals = [];
  return parsed;
}

function mergeMealPlanPartials(partials: PartialMealPlan[], fileName: string): ParsedMealPlan {
  const mealsById = new Map<string, ParsedMeal>();
  let title = "";
  let patientName: string | null = null;
  let prescribedAt: string | null = null;

  for (const partial of partials) {
    if (!title && partial.title) title = partial.title;
    if (!patientName && partial.patientName) patientName = partial.patientName;
    if (!prescribedAt && partial.prescribedAt) prescribedAt = partial.prescribedAt;

    for (const meal of partial.meals || []) {
      if (!meal?.id || !Array.isArray(meal.items)) continue;
      const existing = mealsById.get(meal.id);
      if (!existing) {
        mealsById.set(meal.id, meal);
        continue;
      }
      const itemKeys = new Set(existing.items.map((item) => item.key));
      for (const item of meal.items) {
        if (!itemKeys.has(item.key)) {
          existing.items.push(item);
          itemKeys.add(item.key);
        }
      }
    }
  }

  const meals = [...mealsById.values()].sort((a, b) => String(a.time).localeCompare(String(b.time)));
  if (!meals.length) {
    throw new Error("A IA não conseguiu extrair refeições do PDF.");
  }

  return {
    title: title || fileName.replace(/\.pdf$/i, ""),
    patientName,
    prescribedAt,
    meals,
    fileName,
    parserSource: "ai",
  };
}

export async function parseMealPlanWithAi(text: string, fileName: string): Promise<ParsedMealPlan> {
  const blocks = splitPlainTextIntoBlocks(text, "Trecho do PDF");

  if (blocks.length <= 1) {
    const singleBlock: PdfTextBlock = blocks[0] || {
      index: 0,
      label: "Documento completo",
      text: text.slice(0, 12000),
    };
    const parsed = await parseMealPlanBlock(singleBlock, false);
    if (!parsed.meals?.length) {
      throw new Error("A IA não conseguiu extrair refeições do PDF.");
    }
    return finalizeMealPlan({ ...parsed, fileName, parserSource: "ai" });
  }

  const partials = await processPdfBlocksSequentially(blocks, (block) =>
    parseMealPlanBlock(block, true),
  );

  return finalizeMealPlan(mergeMealPlanPartials(partials, fileName));
}

function finalizeMealPlan(plan: ParsedMealPlan): ParsedMealPlan {
  return sanitizeMealPlanSubstitutions(plan);
}
