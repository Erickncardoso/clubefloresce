import { readEnv } from "../../utils/env";
import { OpenAIClient } from "../bella/openai.client";
import { getBellaModels } from "../bella/model-config";

export type SmartShoppingListSection = {
  category: string;
  items: string[];
};

export class ShoppingListSmartService {
  private openai = new OpenAIClient();

  async organize(input: {
    itemsText: string;
    planTitle?: string;
    periodDays?: number;
  }): Promise<{ sections: SmartShoppingListSection[]; text: string }> {
    const apiKey = readEnv("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("Lista Inteligente indisponível. Configure OPENAI_API_KEY no servidor.");
    }

    const itemsText = String(input.itemsText || "").trim();
    if (!itemsText) {
      throw new Error("Adicione itens à lista antes de usar a Lista Inteligente.");
    }

    const models = getBellaModels();
    const system = [
      "Você organiza listas de compras de planos alimentares para pacientes no Brasil.",
      "Agrupe os itens por categoria de supermercado, na ordem natural de percurso:",
      "Hortifruti, Proteínas, Laticínios, Mercearia, Congelados, Bebidas, Outros.",
      "Responda APENAS com JSON válido no formato:",
      '{"sections":[{"category":"Hortifruti","items":["Tomate — 4 un"]}]}',
      "Mantenha quantidades e unidades originais quando existirem.",
      "Unifique itens repetidos somando quantidades compatíveis.",
      "Não invente alimentos que não estejam na lista de entrada.",
      "Use português do Brasil.",
    ].join(" ");

    const userPrompt = [
      input.planTitle ? `Plano: ${input.planTitle}` : null,
      input.periodDays ? `Período: ${input.periodDays} dias` : null,
      "",
      "Lista bruta:",
      itemsText.slice(0, 6000),
    ]
      .filter((line) => line != null)
      .join("\n");

    const result = await this.openai.complete({
      model: models.chat,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      maxTokens: 1800,
      responseFormat: { type: "json_object" },
    });

    const parsed = parseSmartListResponse(String(result.content || ""));
    if (!parsed.sections.length) {
      throw new Error("A IA não retornou categorias válidas. Tente novamente.");
    }

    return parsed;
  }
}

function parseSmartListResponse(raw: string): { sections: SmartShoppingListSection[]; text: string } {
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Resposta da IA inválida.");
    payload = JSON.parse(match[0]);
  }

  const sectionsRaw = Array.isArray((payload as { sections?: unknown }).sections)
    ? (payload as { sections: unknown[] }).sections
    : [];

  const sections = sectionsRaw
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const category = String((entry as { category?: unknown }).category || "").trim();
      const itemsRaw = (entry as { items?: unknown }).items;
      const items = Array.isArray(itemsRaw)
        ? itemsRaw.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 80)
        : [];
      if (!category || !items.length) return null;
      return { category, items };
    })
    .filter(Boolean)
    .slice(0, 12) as SmartShoppingListSection[];

  const text = sections
    .map((section) => [`## ${section.category}`, ...section.items].join("\n"))
    .join("\n\n");

  return { sections, text };
}
