import { randomUUID } from "crypto";
import { OpenAIClient, buildImageDataUrl } from "./openai.client";
import { getModelForTask } from "./model-config";
import type { MealItemDraft } from "../../types/food-diary.types";
import { enrichMealItemsWithFoodBank } from "./meal-food-enricher";
import { round1 } from "./meal-item-math";

const llm = new OpenAIClient();

export interface ReceiptAnalysisDraft {
  storeName?: string;
  items: MealItemDraft[];
  notes?: string;
  matchedCount: number;
  unmatchedCount: number;
}

function buildReceiptJsonPrompt(userQuestion: string): string {
  return `Você lê cupons fiscais / faturas / notas de supermercado brasileiros e extrai ALIMENTOS.

Retorne SOMENTE JSON válido (sem markdown):
{
  "readable": true,
  "storeName": "Nome do mercado (se legível)",
  "items": [
    {
      "rawName": "texto exato da linha do cupom",
      "name": "nome limpo em português, preferindo nomenclatura TBCA/TACO",
      "quantity": 1,
      "unit": "un",
      "grams": 1000
    }
  ],
  "notes": "observação curta se útil"
}

Regras:
- Inclua APENAS itens alimentícios (comida, bebida, tempero, laticínio, hortifruti, padaria, congelados, etc.).
- IGNORE: sacola, taxa, frete, desconto, pagamento, CPF, CNPJ, totais, códigos de barras sozinhos, produtos de limpeza/higiene (exceto se claramente alimentício).
- "rawName" = texto da linha do cupom (abreviado ok).
- "name" = nome compreensível para casar com TBCA/TACO. Exemplos:
  - ARZ T1 AGUL → "Arroz, tipo 1, cru"
  - FEIJ CARIOCA → "Feijão, carioca, cru"
  - LEITE INT UHT → "Leite, de vaca, integral"
  - BANANA NANICA → "Banana, nanica, crua"
  - FILE FRANGO → "Frango, peito, sem pele, cru"
- "quantity" e "unit": un | kg | g | L | ml (como no cupom).
- "grams": converta para gramas quando possível (1 kg → 1000; 500 g → 500). Se só houver unidade (un) sem peso, estime o peso típico da embalagem ou use 100.
- Se a imagem NÃO for cupom/fatura legível: { "readable": false, "illegibleReason": "motivo curto", "items": [] }
- Não invente itens que não aparecem no cupom.
- Mínimo 1 item quando houver alimento legível.

Pedido do paciente: ${userQuestion || "Extraia os alimentos deste cupom e prepare para vincular à base TBCA/TACO."}`;
}

function estimateGrams(quantity: number, unit: string, explicitGrams: number): number {
  if (explicitGrams > 0) return Math.round(explicitGrams);
  const q = quantity > 0 ? quantity : 1;
  const u = unit.toLowerCase();
  if (u === "kg") return Math.round(q * 1000);
  if (u === "g") return Math.round(q);
  if (u === "l" || u === "lt" || u === "litro") return Math.round(q * 1000);
  if (u === "ml") return Math.round(q);
  return Math.max(1, Math.round(q * 100));
}

function parseReceiptJson(raw: string): {
  items: MealItemDraft[];
  storeName?: string;
  notes?: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Não consegui interpretar o cupom. Tente outra foto, mais nítida.");
  }

  const data = parsed as {
    readable?: boolean;
    illegibleReason?: string;
    storeName?: string;
    items?: unknown[];
    notes?: string;
  };

  if (data.readable === false) {
    throw new Error(
      String(data.illegibleReason || "").trim() ||
        "Não consegui ler o cupom. Tire foto de perto, com boa luz e sem reflexo.",
    );
  }

  const items: MealItemDraft[] = [];
  for (const row of data.items || []) {
    const item = row as Record<string, unknown>;
    const rawName = String(item.rawName || item.name || "").trim();
    const name = String(item.name || item.rawName || "").trim();
    if (!name) continue;

    const quantity = Number(item.quantity) || 1;
    const unit = String(item.unit || "un").trim() || "un";
    const grams = estimateGrams(quantity, unit, Number(item.grams) || 0);

    items.push({
      id: randomUUID(),
      name,
      grams: Math.max(1, grams),
      caloriesKcal: Math.max(0, Math.round(Number(item.caloriesKcal) || 0)),
      carbsG: round1(Number(item.carbsG) || 0),
      proteinG: round1(Number(item.proteinG) || 0),
      fatG: round1(Number(item.fatG) || 0),
      foodId: null,
      source: "ai",
      originalName: rawName || name,
    });
  }

  if (!items.length) {
    throw new Error(
      String(data.notes || "").trim() ||
        "Não identifiquei alimentos neste cupom. Confira se a foto mostra as linhas dos produtos.",
    );
  }

  return {
    items,
    storeName: data.storeName ? String(data.storeName).trim() : undefined,
    notes: data.notes ? String(data.notes).trim() : undefined,
  };
}

function countMatches(items: MealItemDraft[]) {
  const matchedCount = items.filter((item) => Boolean(item.foodId)).length;
  return {
    matchedCount,
    unmatchedCount: items.length - matchedCount,
  };
}

export function buildReceiptAnalysisPreview(
  draft: ReceiptAnalysisDraft,
): string {
  const store = draft.storeName ? ` em **${draft.storeName}**` : "";
  const lines = draft.items.slice(0, 12).map((item) => {
    const link = item.foodId
      ? `→ **${item.name}** (base)`
      : `→ _sem match_ (revise no modal)`;
    return `- ${item.originalName || item.name} ${link}`;
  });
  const more =
    draft.items.length > 12 ? `\n- …e mais ${draft.items.length - 12} item(ns)` : "";

  return (
    `Li o cupom${store} e vinculei **${draft.matchedCount}** de **${draft.items.length}** itens à base TBCA/TACO` +
    (draft.unmatchedCount ? ` (${draft.unmatchedCount} para você revisar)` : "") +
    `.\n\n` +
    lines.join("\n") +
    more +
    `\n\nConfirme no modal: ajuste o que estiver errado buscando na base de alimentos.`
  );
}

export async function analyzeReceiptStructured(
  buffer: Buffer,
  mimeType: string,
  userQuestion: string,
): Promise<ReceiptAnalysisDraft> {
  if (!llm.isEnabled()) {
    throw new Error("Análise de cupom por foto requer OpenAI configurada no servidor.");
  }

  const model = getModelForTask("image");
  const dataUrl = buildImageDataUrl(buffer, mimeType);

  const completion = await llm.complete({
    messages: [
      { role: "system", content: buildReceiptJsonPrompt(userQuestion) },
      {
        role: "user",
        content: [
          { type: "text", text: userQuestion || "Extraia os alimentos deste cupom." },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
        ],
      },
    ],
    model,
    temperature: 0.1,
    maxTokens: 2500,
    responseFormat: { type: "json_object" },
  });

  if (!completion.content) {
    throw new Error("Não consegui analisar o cupom agora. Tente outra foto.");
  }

  const parsed = parseReceiptJson(completion.content);
  const enrichedItems = await enrichMealItemsWithFoodBank(parsed.items);
  const counts = countMatches(enrichedItems);

  return {
    storeName: parsed.storeName,
    items: enrichedItems,
    notes: parsed.notes,
    ...counts,
  };
}
