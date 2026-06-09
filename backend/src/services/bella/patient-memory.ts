import { MealPlanRepository } from "../../repositories/meal-plan.repository";
import type { ParsedMealPlan } from "../../types/meal-plan.types";
import type { DailyDiarySummary, MealItemDraft } from "../../types/food-diary.types";
import {
  formatDailyDiaryForPrompt,
  formatMealPlanForPrompt,
  resolveMealSlot,
} from "./meal-plan-context";
import { buildCheckInSummary, firstName, formatDate } from "./patient-context-helpers";
import { getFoodDiaryService } from "./food-diary-access";
import { UserRepository } from "../../repositories/user.repository";

const mealPlanRepository = new MealPlanRepository();
const userRepository = new UserRepository();

function formatEntryItems(items: MealItemDraft[]): string {
  if (!items.length) return "sem detalhes";
  return items
    .slice(0, 6)
    .map((item) => `${item.name} (${item.grams} g, ${item.caloriesKcal} kcal)`)
    .join("; ");
}

function formatTodayEntries(summary: DailyDiarySummary): string {
  if (!summary.entries.length) {
    return "Nenhuma refeição registrada hoje ainda.";
  }

  return summary.entries
    .map(
      (entry) =>
        `- ${entry.mealLabel || entry.mealType}: ${entry.caloriesKcal} kcal (C ${entry.carbsG} g · P ${entry.proteinG} g · G ${entry.fatG} g) — ${formatEntryItems(entry.items)}`,
    )
    .join("\n");
}

export interface PatientVerifiedMemory {
  userId: string;
  patientName: string;
  firstName: string;
  appPlan: string;
  memberSince: string;
  currentMealSlot: string;
  mealPlanText: string;
  hasMealPlan: boolean;
  dailyDiaryText: string;
  todayEntriesText: string;
  checkInSummary: string;
  promptBlock: string;
}

export async function buildPatientVerifiedMemory(
  userId: string,
  patientDateKey?: string,
): Promise<PatientVerifiedMemory> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  const [mealPlanRecord, dailySummary, checkInSummary, mealSlot] = await Promise.all([
    mealPlanRepository.findByUserId(userId),
    getFoodDiaryService().then((service) => service.getDailySummary(userId, patientDateKey)),
    buildCheckInSummary(userId),
    resolveMealSlot(userId),
  ]);

  const plan = mealPlanRecord?.plan as ParsedMealPlan | undefined;
  const mealPlanText = formatMealPlanForPrompt(plan);
  const dailyDiaryText = formatDailyDiaryForPrompt(dailySummary);
  const todayEntriesText = formatTodayEntries(dailySummary);
  const patientName = user.name;
  const patientFirstName = firstName(patientName);

  const promptBlock = `## Memória verificada (fonte: banco de dados — use APENAS isto)
- Paciente ativa: **${patientName}** (chame de ${patientFirstName})
- ID interno: ${userId} (escopo exclusivo desta conversa; nunca misture com outro ID)
- Plano do app: ${user.plan}
- Membro desde: ${formatDate(user.createdAt)}
- Refeição provável agora: **${mealSlot.mealLabel}**

### Plano alimentar prescrito
${mealPlanText}

### Diário alimentar de hoje
${dailyDiaryText}

### Refeições já registradas hoje
${todayEntriesText}

### Check-ins recentes
${checkInSummary}`;

  return {
    userId,
    patientName,
    firstName: patientFirstName,
    appPlan: user.plan,
    memberSince: formatDate(user.createdAt),
    currentMealSlot: mealSlot.mealLabel,
    mealPlanText,
    hasMealPlan: Boolean(plan?.meals?.length),
    dailyDiaryText,
    todayEntriesText,
    checkInSummary,
    promptBlock,
  };
}
