import { randomUUID } from "crypto";
import { BellaRepository } from "../repositories/bella.repository";
import { FoodDiaryRepository } from "../repositories/food-diary.repository";
import { round1, sumItems } from "./bella/meal-item-math";
import type {
  DailyDiarySummary,
  MealItemDraft,
  MacroTotals,
  NutritionTargets,
} from "../types/food-diary.types";

import { entryDateFromKey, getDateKeyInTimeZone } from "../utils/patient-timezone";

let foodDiaryRepository: FoodDiaryRepository | null = null;
let bellaRepository: BellaRepository | null = null;

function getFoodDiaryRepository(): FoodDiaryRepository {
  if (!foodDiaryRepository) foodDiaryRepository = new FoodDiaryRepository();
  return foodDiaryRepository;
}

function getBellaRepository(): BellaRepository {
  if (!bellaRepository) bellaRepository = new BellaRepository();
  return bellaRepository;
}

function subtractMacros(targets: NutritionTargets, consumed: MacroTotals): MacroTotals {
  return {
    caloriesKcal: Math.max(0, Math.round(targets.caloriesKcal - consumed.caloriesKcal)),
    carbsG: round1(Math.max(0, targets.carbsG - consumed.carbsG)),
    proteinG: round1(Math.max(0, targets.proteinG - consumed.proteinG)),
    fatG: round1(Math.max(0, targets.fatG - consumed.fatG)),
  };
}

function parseItems(raw: unknown): MealItemDraft[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const item = row as MealItemDraft;
      return {
        id: String(item.id || ""),
        name: String(item.name || "").trim(),
        grams: Math.max(1, Math.round(Number(item.grams) || 0)),
        caloriesKcal: Math.max(0, Math.round(Number(item.caloriesKcal) || 0)),
        carbsG: round1(Number(item.carbsG) || 0),
        proteinG: round1(Number(item.proteinG) || 0),
        fatG: round1(Number(item.fatG) || 0),
        foodId: item.foodId ? String(item.foodId) : null,
        source: item.source || (item.foodId ? "food_bank" : "ai"),
        originalName: item.originalName ? String(item.originalName) : null,
      };
    })
    .filter((item) => item.name);
}

export function buildDiaryAssistantReply(
  mealLabel: string,
  items: MealItemDraft[],
  mealTotals: MacroTotals,
  dailySummary: DailyDiarySummary,
): string {
  const lines = items.map(
    (item) =>
      `- **${item.name}**: ${item.grams} g · ${item.caloriesKcal} kcal · C ${item.carbsG} g · P ${item.proteinG} g · G ${item.fatG} g`,
  );

  return (
    `Registrei seu **${mealLabel}** no diário alimentar.\n\n` +
    `## Itens confirmados\n${lines.join("\n")}\n\n` +
    `## Total desta refeição\n` +
    `- Calorias: ${mealTotals.caloriesKcal} kcal\n` +
    `- Carboidratos: ${mealTotals.carbsG} g\n` +
    `- Proteínas: ${mealTotals.proteinG} g\n` +
    `- Gorduras: ${mealTotals.fatG} g\n\n` +
    `## Seu dia até agora\n` +
    `- Consumido: ${dailySummary.consumed.caloriesKcal} / ${dailySummary.targets.caloriesKcal} kcal\n` +
    `- Proteínas: ${dailySummary.consumed.proteinG} / ${dailySummary.targets.proteinG} g\n` +
    `- Carboidratos: ${dailySummary.consumed.carbsG} / ${dailySummary.targets.carbsG} g\n` +
    `- Gorduras: ${dailySummary.consumed.fatG} / ${dailySummary.targets.fatG} g\n\n` +
    `Faltam **${dailySummary.remaining.caloriesKcal} kcal** para a meta do dia.`
  );
}

export class FoodDiaryService {
  async getDailySummary(userId: string, dateKey?: string): Promise<DailyDiarySummary> {
    const key = dateKey || getDateKeyInTimeZone("UTC");
    const entryDate = entryDateFromKey(key);
    const repo = getFoodDiaryRepository();
    const targetsRow = await repo.getOrCreateTargets(userId);
    const entries = await repo.findEntriesByDate(userId, entryDate);

    const targets: NutritionTargets = {
      caloriesKcal: targetsRow.caloriesKcal,
      carbsG: targetsRow.carbsG,
      proteinG: targetsRow.proteinG,
      fatG: targetsRow.fatG,
    };

    const consumed = entries.reduce(
      (acc, entry) => ({
        caloriesKcal: acc.caloriesKcal + entry.caloriesKcal,
        carbsG: round1(acc.carbsG + entry.carbsG),
        proteinG: round1(acc.proteinG + entry.proteinG),
        fatG: round1(acc.fatG + entry.fatG),
      }),
      { caloriesKcal: 0, carbsG: 0, proteinG: 0, fatG: 0 },
    );

    return {
      date: key,
      targets,
      consumed,
      remaining: subtractMacros(targets, consumed),
      entries: entries.map((entry) => ({
        id: entry.id,
        mealType: entry.mealType,
        mealLabel: entry.mealLabel,
        imageUrl: entry.imageUrl,
        caloriesKcal: entry.caloriesKcal,
        carbsG: entry.carbsG,
        proteinG: entry.proteinG,
        fatG: entry.fatG,
        items: parseItems(entry.items),
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  }

  async confirmEntry(
    userId: string,
    payload: {
      items: MealItemDraft[];
      mealType: string;
      mealLabel?: string;
      imageUrl?: string;
      topic?: string;
      userMessageId?: string;
    },
    dateKey?: string,
  ) {
    const items = payload.items.map((item) => ({
      id: item.id || randomUUID(),
      name: String(item.name || "").trim(),
      grams: Math.max(1, Math.round(Number(item.grams) || 0)),
      caloriesKcal: Math.max(0, Math.round(Number(item.caloriesKcal) || 0)),
      carbsG: round1(Number(item.carbsG) || 0),
      proteinG: round1(Number(item.proteinG) || 0),
      fatG: round1(Number(item.fatG) || 0),
      foodId: item.foodId ? String(item.foodId) : null,
      source: item.source || (item.foodId ? "food_bank" : "manual"),
      originalName: item.originalName ? String(item.originalName) : null,
    }));

    if (!items.length) throw new Error("Adicione pelo menos um alimento.");
    if (items.some((item) => !item.name)) {
      throw new Error("Preencha o nome de todos os alimentos.");
    }

    const totals = sumItems(items);
    const key = dateKey || getDateKeyInTimeZone("UTC");
    const entryDate = entryDateFromKey(key);
    const mealLabel = payload.mealLabel?.trim() || "Refeição";

    const entry = await getFoodDiaryRepository().createEntry({
      userId,
      entryDate,
      mealType: payload.mealType || "other",
      mealLabel,
      imageUrl: payload.imageUrl,
      items,
      ...totals,
    });

    const dailySummary = await this.getDailySummary(userId, key);
    const reply = buildDiaryAssistantReply(mealLabel, items, totals, dailySummary);

    const assistantMsg = await getBellaRepository().create(userId, "assistant", reply, {
      topic: payload.topic || "meal",
      metadata: {
        topic: "meal",
        taskType: "meal_diary",
        foodDiaryEntryId: entry.id,
        mealTotals: totals,
      },
    });

    return {
      entry,
      dailySummary,
      message: assistantMsg,
    };
  }
}
