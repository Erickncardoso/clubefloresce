import { randomUUID } from "crypto";
import { OpenAIClient, buildImageDataUrl } from "./openai.client";
import { buildUserContext } from "./context-builder";
import { BELLA_MEMORY_RULES } from "./memory-rules";
import { getModelForTask } from "./model-config";
import type { UserContextSnapshot } from "./types";
import type { MealAnalysisDraft, MealItemDraft } from "../../types/food-diary.types";
import { round1, sumItems } from "./meal-item-math";
import { enrichMealItemsWithFoodBank, recalculateMealTotals } from "./meal-food-enricher";

export { sumItems, scaleItemGrams } from "./meal-item-math";

const llm = new OpenAIClient();

function buildMealJsonPrompt(ctx: UserContextSnapshot, userQuestion: string): string {
  return `${BELLA_MEMORY_RULES}

${ctx.verifiedMemory}

Você analisa fotos de pratos para ${ctx.firstName}, nutricionista virtual do Clube Florescer.
Use a memória verificada acima. Não invente alimentos já registrados hoje nem itens do plano que não estão na foto.

Retorne SOMENTE um JSON válido (sem markdown) neste formato:
{
  "items": [
    {
      "name": "Nome do alimento",
      "grams": 150,
      "caloriesKcal": 195,
      "carbsG": 40,
      "proteinG": 4,
      "fatG": 1.5
    }
  ],
  "notes": "Breve observação sobre a estimativa visual"
}

Regras:
- Identifique CADA alimento visível no prato.
- Use nomes EXATOS da TACO/TBCA quando souber, por exemplo:
  - arroz branco cozido → "Arroz, tipo 1, cozido"
  - arroz integral cozido → "Arroz, integral, cozido"
  - feijão carioca cozido → "Feijão, carioca, cozido"
  - frango grelhado → "Frango, peito, sem pele, grelhado"
- Preencha apenas "grams" (porção estimada em gramas). Calorias e macros serão calculados pela base de alimentos quando houver correspondência.
- Se não reconhecer o alimento, ainda assim informe name e grams; deixe caloriesKcal, carbsG, proteinG e fatG como estimativa coerente.
- Não invente itens invisíveis.
- Se a foto não mostrar comida, retorne "items": [] e explique em "notes".
- Mínimo 1 item quando houver comida reconhecível.

Pergunta do paciente: ${userQuestion || "Estime gramas e nutrientes de cada item do prato."}`;
}

function parseAnalysisJson(raw: string): MealAnalysisDraft {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Não consegui interpretar a análise do prato. Tente outra foto.");
  }

  const data = parsed as { items?: unknown[]; notes?: string };
  const items: MealItemDraft[] = [];

  for (const row of data.items || []) {
    const item = row as Record<string, unknown>;
    const name = String(item.name || "").trim();
    if (!name) continue;

    items.push({
      id: randomUUID(),
      name,
      grams: Math.max(1, Math.round(Number(item.grams) || 0)),
      caloriesKcal: Math.max(0, Math.round(Number(item.caloriesKcal) || 0)),
      carbsG: round1(Number(item.carbsG) || 0),
      proteinG: round1(Number(item.proteinG) || 0),
      fatG: round1(Number(item.fatG) || 0),
      foodId: null,
      source: "ai",
      originalName: name,
    });
  }

  if (!items.length) {
    throw new Error(
      String(data.notes || "").trim() ||
        "Não identifiquei alimentos na foto. Tire outra de cima, com boa luz.",
    );
  }

  return {
    items,
    totals: sumItems(items),
    notes: data.notes ? String(data.notes).trim() : undefined,
  };
}

export async function analyzeMealStructured(
  userId: string,
  buffer: Buffer,
  mimeType: string,
  userQuestion: string,
  patientDateKey?: string,
): Promise<MealAnalysisDraft> {
  if (!llm.isEnabled()) {
    throw new Error("Análise de prato por foto requer OpenAI configurada no servidor.");
  }

  const ctx = await buildUserContext(userId, patientDateKey);
  const model = getModelForTask("image");
  const dataUrl = buildImageDataUrl(buffer, mimeType);

  const completion = await llm.complete({
    messages: [
      { role: "system", content: buildMealJsonPrompt(ctx, userQuestion) },
      {
        role: "user",
        content: [
          { type: "text", text: userQuestion || "Analise este prato." },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
        ],
      },
    ],
    model,
    temperature: 0.2,
    maxTokens: 1200,
    responseFormat: { type: "json_object" },
  });

  if (!completion.content) {
    throw new Error("Não consegui analisar o prato agora. Tente outra foto.");
  }

  const draft = parseAnalysisJson(completion.content);
  const enrichedItems = await enrichMealItemsWithFoodBank(draft.items);

  return {
    ...draft,
    items: enrichedItems,
    totals: recalculateMealTotals(enrichedItems),
  };
}
