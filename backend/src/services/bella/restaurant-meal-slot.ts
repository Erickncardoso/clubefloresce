import type { ParsedFoodItem, ParsedMeal } from "../../types/meal-plan.types";
import { getLocalMinutesInTimeZone } from "../../utils/patient-local-clock";
import { inferMealSlotFromTime } from "../../utils/meal-time";

export type MealPeriod = "breakfast" | "lunch" | "dinner" | "snack";

export interface RestaurantMealSlotResult {
  mealType: string;
  mealLabel: string;
  prescribedMealText: string;
  slotReason: string;
}

const DEFAULT_ZONE = "America/Sao_Paulo";

const OUTING_SIGNALS =
  /rod[ií]zio|restaurante|comer fora|delivery|ifood|sushi|japon[eê]s|pizza|hamb[uú]rguer|card[aá]pio|buffet|fast food|aça[ií]|acai|churrascaria|self[- ]service/i;

const DINNER_HINTS = /jantar|janta|noite|à noite|a noite|depois do trabalho/i;
const LUNCH_HINTS = /almo[cç]o|meio[- ]dia|hora do almo/i;
const BREAKFAST_HINTS = /caf[eé] da manh[aã]|cafe da manha|desjejum/i;
const SNACK_HINTS = /lanche(?!iro)/i;

function formatFoodItem(item: ParsedFoodItem): string {
  const amount = item.display || [item.amount, item.unit].filter(Boolean).join(" ");
  return amount ? `${item.name} (${amount})` : item.name;
}

function formatPrescribedMeal(meal: ParsedMeal | null): string {
  if (!meal) {
    return "Não há refeição equivalente cadastrada no plano — use as metas do diário de hoje.";
  }
  const items = meal.items.map(formatFoodItem).join("; ");
  const time = meal.time ? ` às ${meal.time}` : "";
  return `**${meal.label}**${time}: ${items || "sem itens listados"}`;
}

export function classifyMealPeriod(meal: ParsedMeal): MealPeriod {
  const id = meal.id.toLowerCase();
  const label = meal.label.toLowerCase();

  if (
    id.includes("dinner")
    || id.includes("jantar")
    || label.includes("jantar")
    || label.includes("ceia")
  ) {
    return "dinner";
  }

  if (
    id.includes("lunch")
    || id.includes("almoco")
    || id.includes("almoço")
    || label.includes("almoço")
    || label.includes("almoco")
  ) {
    return "lunch";
  }

  if (
    id.includes("breakfast")
    || id.includes("cafe")
    || label.includes("café")
    || label.includes("cafe")
    || label.includes("desjejum")
  ) {
    return "breakfast";
  }

  return "snack";
}

function findMealByPeriod(meals: ParsedMeal[], period: MealPeriod): ParsedMeal | null {
  return meals.find((meal) => classifyMealPeriod(meal) === period) || null;
}

function parseMealHintFromMessage(message: string): MealPeriod | null {
  const text = message.trim();
  if (!text) return null;

  if (BREAKFAST_HINTS.test(text)) return "breakfast";
  if (DINNER_HINTS.test(text)) return "dinner";
  if (LUNCH_HINTS.test(text)) return "lunch";
  if (SNACK_HINTS.test(text)) return "snack";

  return null;
}

function isRestaurantOutingMessage(message: string): boolean {
  return OUTING_SIGNALS.test(message.trim());
}

function inferOutingPeriod(nowMinutes: number, message: string): MealPeriod {
  const hint = parseMealHintFromMessage(message);
  if (hint && hint !== "snack") return hint;

  if (nowMinutes >= 17 * 60) return "dinner";
  if (nowMinutes >= 11 * 60) return "lunch";

  // Antes das 11h: ainda pode ser almoço/jantar planejado (ex.: "hoje no rodízio")
  if (isRestaurantOutingMessage(message)) return "lunch";

  return "breakfast";
}

function pickNextUnloggedSubstantialMeal(
  meals: ParsedMeal[],
  loggedMealTypes: Set<string>,
  preferred: MealPeriod,
): ParsedMeal | null {
  const order: MealPeriod[] =
    preferred === "dinner"
      ? ["dinner", "lunch", "snack", "breakfast"]
      : preferred === "lunch"
        ? ["lunch", "dinner", "snack", "breakfast"]
        : [preferred, "lunch", "dinner", "snack", "breakfast"];

  for (const period of order) {
    const meal = findMealByPeriod(meals, period);
    if (meal && !loggedMealTypes.has(meal.id)) return meal;
  }

  return findMealByPeriod(meals, preferred);
}

export function resolveRestaurantMealSlot(params: {
  planMeals?: ParsedMeal[];
  loggedMealTypes?: string[];
  userMessage?: string;
  patientTimeZone?: string;
  now?: Date;
}): RestaurantMealSlotResult {
  const meals = params.planMeals?.length ? params.planMeals : [];
  const logged = new Set((params.loggedMealTypes || []).filter(Boolean));
  const message = params.userMessage?.trim() || "";
  const nowMinutes = getLocalMinutesInTimeZone(params.patientTimeZone || DEFAULT_ZONE, params.now);

  const clockSlot = inferMealSlotFromTime(params.now || new Date(), meals);
  const outing = isRestaurantOutingMessage(message) || Boolean(message);

  let targetPeriod: MealPeriod;
  let slotReason: string;

  const explicitHint = parseMealHintFromMessage(message);
  if (explicitHint) {
    targetPeriod = explicitHint;
    slotReason = `A paciente indicou **${explicitHint === "breakfast" ? "café da manhã" : explicitHint === "lunch" ? "almoço" : explicitHint === "dinner" ? "jantar" : "lanche"}** na mensagem.`;
  } else if (outing) {
    targetPeriod = inferOutingPeriod(nowMinutes, message);
    if (targetPeriod === "breakfast" && OUTING_SIGNALS.test(message)) {
      targetPeriod = nowMinutes >= 17 * 60 ? "dinner" : "lunch";
    }
    slotReason =
      targetPeriod === "dinner"
        ? "Refeição fora no período da noite — trate como **jantar** do plano."
        : targetPeriod === "lunch"
          ? "Refeição fora (restaurante/rodízio/delivery) — trate como **almoço** do plano, não como café da manhã."
          : `Refeição fora alinhada ao horário atual (${clockSlot.mealLabel}).`;
  } else {
    const clockPeriod = classifyMealPeriod(
      meals.find((meal) => meal.id === clockSlot.mealType) || { id: clockSlot.mealType, label: clockSlot.mealLabel, time: "", items: [] },
    );
    targetPeriod = clockPeriod === "snack" ? "lunch" : clockPeriod;
    slotReason = `Horário atual da paciente (${Math.floor(nowMinutes / 60)}:${String(nowMinutes % 60).padStart(2, "0")}) — refeição provável: **${clockSlot.mealLabel}**.`;
  }

  let targetMeal = pickNextUnloggedSubstantialMeal(meals, logged, targetPeriod);

  if (!targetMeal && meals.length) {
    targetMeal = findMealByPeriod(meals, targetPeriod) || meals[meals.length - 1];
  }

  if (!targetMeal) {
    const fallbackLabel =
      targetPeriod === "dinner" ? "Jantar" : targetPeriod === "lunch" ? "Almoço" : targetPeriod === "breakfast" ? "Café da manhã" : "Refeição";
    return {
      mealType: targetPeriod,
      mealLabel: fallbackLabel,
      prescribedMealText: formatPrescribedMeal(null),
      slotReason,
    };
  }

  if (outing && classifyMealPeriod(targetMeal) === "breakfast" && OUTING_SIGNALS.test(message)) {
    const bumped = findMealByPeriod(meals, nowMinutes >= 17 * 60 ? "dinner" : "lunch");
    if (bumped) {
      targetMeal = bumped;
      slotReason = "Rodízio/restaurante não substitui café da manhã — usando a refeição principal do dia (**almoço** ou **jantar**).";
    }
  }

  return {
    mealType: targetMeal.id,
    mealLabel: targetMeal.label,
    prescribedMealText: formatPrescribedMeal(targetMeal),
    slotReason,
  };
}
