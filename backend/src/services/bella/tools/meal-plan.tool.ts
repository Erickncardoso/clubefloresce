import type { OpenAIToolDefinition } from "../types";
import {
  buildRestaurantAdvisorContext,
  formatDailyDiaryForPrompt,
  formatMealPlanForPrompt,
  getMealPlanForUser,
} from "../meal-plan-context";
import type { ParsedMealPlan } from "../../../types/meal-plan.types";
import { getFoodDiaryService } from "../food-diary-access";

export const mealPlanToolDefinition: OpenAIToolDefinition = {
  type: "function",
  function: {
    name: "get_patient_meal_plan",
    description:
      "Retorna o plano alimentar individual da paciente (refeições, horários e alimentos prescritos). Use no chat Restaurante para alinhar sugestões ao plano.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

export const dailyDiaryToolDefinition: OpenAIToolDefinition = {
  type: "function",
  function: {
    name: "get_daily_diary_summary",
    description:
      "Retorna o diário alimentar de hoje: metas, consumido, restante e refeições já registradas. Use no chat Restaurante e Meu prato.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

export async function executeMealPlanTool(_args: Record<string, unknown>, ctx: { userId: string }) {
  const record = await getMealPlanForUser(ctx.userId);
  if (!record) {
    return "Plano alimentar ainda não cadastrado. Sugira opções equilibradas de forma geral.";
  }

  const plan = record.plan as unknown as ParsedMealPlan;
  return formatMealPlanForPrompt(plan);
}

export async function executeDailyDiaryTool(_args: Record<string, unknown>, ctx: { userId: string }) {
  const foodDiaryService = await getFoodDiaryService();
  const summary = await foodDiaryService.getDailySummary(ctx.userId);
  return formatDailyDiaryForPrompt(summary);
}

export async function executeRestaurantContextTool(_args: Record<string, unknown>, ctx: { userId: string }) {
  const context = await buildRestaurantAdvisorContext(ctx.userId);
  return (
    `Refeição provável: ${context.currentMealSlot.mealLabel}\n\n` +
    `Plano:\n${context.mealPlanText}\n\n` +
    `Diário:\n${context.dailyDiaryText}`
  );
}
