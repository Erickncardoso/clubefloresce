import { MealPlanRepository } from "../../repositories/meal-plan.repository";
import type { DailyDiarySummary } from "../../types/food-diary.types";
import type { ParsedFoodItem, ParsedMeal, ParsedMealPlan } from "../../types/meal-plan.types";
import { inferMealSlotFromTime } from "../../utils/meal-time";
import { getFoodDiaryService } from "./food-diary-access";
import { buildPatientVerifiedMemory } from "./patient-memory";

const mealPlanRepository = new MealPlanRepository();

function formatFoodItem(item: ParsedFoodItem): string {
  const amount = item.display || [item.amount, item.unit].filter(Boolean).join(" ");
  return amount ? `${item.name} (${amount})` : item.name;
}

function formatMeal(meal: ParsedMeal): string {
  const items = meal.items.map(formatFoodItem).join("; ");
  return `- **${meal.label}** (${meal.time || "horário livre"}): ${items || "sem itens listados"}`;
}

export function formatMealPlanForPrompt(plan: ParsedMealPlan | null | undefined): string {
  if (!plan?.meals?.length) {
    return "Plano alimentar individual ainda não cadastrado no app. Sugira opções equilibradas de forma geral e convide a paciente a conferir com a nutricionista.";
  }

  const header = plan.title ? `Plano: ${plan.title}` : "Plano alimentar da paciente";
  const meals = plan.meals.map(formatMeal).join("\n");
  return `${header}\n${meals}`;
}

export function formatDailyDiaryForPrompt(summary: DailyDiarySummary): string {
  return (
    `Diário de hoje (${summary.date}):\n` +
    `- Meta: ${summary.targets.caloriesKcal} kcal · P ${summary.targets.proteinG} g · C ${summary.targets.carbsG} g · G ${summary.targets.fatG} g\n` +
    `- Consumido: ${summary.consumed.caloriesKcal} kcal · P ${summary.consumed.proteinG} g · C ${summary.consumed.carbsG} g · G ${summary.consumed.fatG} g\n` +
    `- Restante: ${summary.remaining.caloriesKcal} kcal · P ${summary.remaining.proteinG} g · C ${summary.remaining.carbsG} g · G ${summary.remaining.fatG} g\n` +
    `- Refeições registradas: ${summary.entries.length}`
  );
}

export interface MealSlotContext {
  mealType: string;
  mealLabel: string;
}

export interface RestaurantAdvisorContext {
  patientName: string;
  appPlan: string;
  mealPlanText: string;
  dailyDiaryText: string;
  todayEntriesText: string;
  checkInSummary: string;
  currentMealSlot: MealSlotContext;
  hasMealPlan: boolean;
}

export async function getMealPlanForUser(userId: string) {
  return mealPlanRepository.findByUserId(userId);
}

export async function resolveMealSlot(userId: string, date = new Date()): Promise<MealSlotContext> {
  const record = await mealPlanRepository.findByUserId(userId);
  const plan = record?.plan as ParsedMealPlan | undefined;
  return inferMealSlotFromTime(date, plan?.meals || []);
}

export async function buildRestaurantAdvisorContext(
  userId: string,
  dateKey?: string,
): Promise<RestaurantAdvisorContext> {
  const memory = await buildPatientVerifiedMemory(userId, dateKey);
  const currentMealSlot = await resolveMealSlot(userId);

  return {
    patientName: memory.firstName,
    appPlan: memory.appPlan,
    mealPlanText: memory.mealPlanText,
    dailyDiaryText: memory.dailyDiaryText,
    todayEntriesText: memory.todayEntriesText,
    checkInSummary: memory.checkInSummary,
    currentMealSlot,
    hasMealPlan: memory.hasMealPlan,
  };
}

export function buildMealAnalysisPreview(
  mealLabel: string,
  items: Array<{
    name: string;
    grams: number;
    caloriesKcal: number;
    carbsG: number;
    proteinG: number;
    fatG: number;
  }>,
  totals: {
    caloriesKcal: number;
    carbsG: number;
    proteinG: number;
    fatG: number;
  },
  dailySummary: DailyDiarySummary,
  notes?: string,
): string {
  const lines = items.map(
    (item) =>
      `- **${item.name}**: ${item.grams} g · ${item.caloriesKcal} kcal · C ${item.carbsG} g · P ${item.proteinG} g · G ${item.fatG} g`,
  );

  const projected = dailySummary.consumed.caloriesKcal + totals.caloriesKcal;

  return (
    `Analisei seu **${mealLabel}**! Confira os itens abaixo e ajuste se precisar antes de registrar no diário de hoje.\n\n` +
    `## Itens identificados\n${lines.join("\n")}\n\n` +
    `## Total estimado\n` +
    `- Calorias: ${totals.caloriesKcal} kcal\n` +
    `- Carboidratos: ${totals.carbsG} g\n` +
    `- Proteínas: ${totals.proteinG} g\n` +
    `- Gorduras: ${totals.fatG} g\n\n` +
    `## Projeção do dia\n` +
    `Após confirmar: **${projected}** / ${dailySummary.targets.caloriesKcal} kcal\n\n` +
    (notes ? `${notes}\n\n` : "") +
    `Toque em **Confirmar e registrar** para salvar no diário alimentar de hoje.`
  );
}
