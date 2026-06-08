import { OpenAIClient } from "../bella/openai.client";
import { getModelForTask } from "../bella/model-config";
import type { ParsedMealPlan } from "../../types/meal-plan.types";

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

export async function parseMealPlanWithAi(text: string, fileName: string): Promise<ParsedMealPlan> {
  const prompt = `Extraia o planejamento alimentar do texto abaixo e retorne SOMENTE JSON válido (sem markdown) neste formato:
${MEAL_PLAN_JSON_SCHEMA}

Regras:
- Preserve horários (time) e nomes das refeições (label).
- Cada item deve ter "display" com a linha completa do alimento (quantidade + unidade + gramas/ml quando houver).
- Inclua substituições dentro de "substitutions" quando o texto tiver "Opções de substituição".
- Não invente alimentos que não estejam no texto.
- Use ids em slug (ex.: "0615-cafe-da-manha").
- parserSource será definido depois.

Texto do PDF:
---
${text.slice(0, 12000)}
---`;

  const result = await llm.complete({
    model: getModelForTask("pdf"),
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    maxTokens: 6000,
    responseFormat: { type: "json_object" },
  });

  const raw = result.content || "";

  const jsonText = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(jsonText) as Omit<ParsedMealPlan, "fileName" | "parserSource">;

  if (!Array.isArray(parsed.meals) || !parsed.meals.length) {
    throw new Error("A IA não conseguiu extrair refeições do PDF.");
  }

  return {
    ...parsed,
    fileName,
    parserSource: "ai",
  };
}
