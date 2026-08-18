import { randomUUID } from "crypto";
import { OpenAIClient, buildImageDataUrl } from "./openai.client";
import { UserRepository } from "../../repositories/user.repository";
import { firstName } from "./patient-context-helpers";
import { getModelForTask } from "./model-config";
import type { MealAnalysisDraft, MealItemDraft } from "../../types/food-diary.types";
import { round1, sumItems } from "./meal-item-math";
import { enrichMealItemsWithFoodBank, recalculateMealTotals } from "./meal-food-enricher";

export { sumItems, scaleItemGrams } from "./meal-item-math";

const llm = new OpenAIClient();
const userRepository = new UserRepository();

function buildMealJsonPrompt(firstName: string, userQuestion: string): string {
  return `Você analisa a FOTO do prato de ${firstName}, nutricionista virtual do Clube Florescer.

Regra principal: descreva SOMENTE o que aparece na imagem.
- NÃO use plano alimentar, diário, refeições típicas nem memória da paciente para completar o prato.
- Se um alimento não estiver visível, não liste.
- Não troque o que está na foto por itens prescritos.

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
- Use nomes EXATOS da TBCA/TACO quando souber, por exemplo:
  - arroz branco cozido → "Arroz, tipo 1, cozido"
  - arroz integral cozido → "Arroz, integral, cozido"
  - feijão carioca cozido → "Feijão, carioca, cozido"
  - frango grelhado → "Frango, peito, sem pele, grelhado"
- Preencha "grams" (porção estimada em gramas). Calorias e macros serão recalculados pela base de alimentos quando houver correspondência.
- Se não reconhecer o alimento, ainda informe name e grams; estime caloriesKcal, carbsG, proteinG e fatG.
- Se identificar um prato preparado (bolo, lasanha, strogonoff, pizza, sanduíche, feijoada etc.), liste cada ingrediente visível ou separável. Se não conseguir separar, use um nome descritivo e avise em "notes".
- Se a foto não mostrar comida, retorne "items": [] e explique em "notes".
- Mínimo 1 item quando houver comida reconhecível.

Pergunta da paciente: ${userQuestion || "Estime gramas e nutrientes de cada item visível nesta foto."}`;
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
  _patientDateKey?: string,
): Promise<MealAnalysisDraft> {
  if (!llm.isEnabled()) {
    throw new Error("Análise de prato por foto requer OpenAI configurada no servidor.");
  }

  const user = await userRepository.findById(userId);
  const model = getModelForTask("image");
  const dataUrl = buildImageDataUrl(buffer, mimeType);
  const systemPrompt = buildMealJsonPrompt(firstName(user?.name || "você"), userQuestion);

  const completion = await llm.complete({
    messages: [
      { role: "system", content: systemPrompt },
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
