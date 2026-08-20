import type { ParsedFoodItem, ParsedMeal } from "../types/meal-plan.types";

const MAX_PUSH_ITEMS = 3;
const MAX_PUSH_BODY_LENGTH = 180;

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatAmountUnit(amount: number, unit: string): string {
  const qty = Number.isInteger(amount) ? String(amount) : String(amount);
  const normalizedUnit = cleanText(unit);
  if (!normalizedUnit) return qty;

  // "colher(es) de sopa" + amount 10 → "10 colheres de sopa" (heurística leve)
  const pluralized = normalizedUnit
    .replace(/\(es\)/gi, amount === 1 ? "" : "es")
    .replace(/\(s\)/gi, amount === 1 ? "" : "s");

  return `${qty} ${pluralized}`.replace(/\s+/g, " ").trim();
}

/**
 * Linha de item para a push — espelha o card da home (nome + porção).
 */
export function formatMealReminderItemLine(item: ParsedFoodItem): string {
  const name = cleanText(item?.name);
  const display = cleanText(item?.display);
  const unit = cleanText(item?.unit);
  const amount = typeof item?.amount === "number" && Number.isFinite(item.amount)
    ? item.amount
    : null;

  let line = "";

  if (name && amount != null && unit) {
    line = `${name} · ${formatAmountUnit(amount, unit)}`;
  } else if (display) {
    line = display;
  } else if (name) {
    line = name;
  }

  if (!line) return "";

  const grams = typeof item?.grams === "number" && Number.isFinite(item.grams) && item.grams > 0
    ? Math.round(item.grams)
    : null;

  if (grams != null && !/\b\d+(?:[.,]\d+)?\s*g\b/i.test(line)) {
    line = `${line} · ${grams} g`;
  }

  return cleanText(line);
}

export function buildMealReminderTitle(meal: Pick<ParsedMeal, "label"> | { label?: string }): string {
  const label = cleanText(meal?.label);
  return label || "Refeição";
}

/**
 * Corpo da push: itens do plano (nome + porção). Sem itens → CTA genérico.
 */
export function buildMealReminderFullBody(
  meal: Pick<ParsedMeal, "items"> | { items?: ParsedFoodItem[] | null },
): string {
  const lines = mealReminderItemLines(meal);
  if (!lines.length) return "Registre sua refeição no diário alimentar.";
  return lines.join(" · ");
}

export function buildMealReminderBody(
  meal: Pick<ParsedMeal, "items"> | { items?: ParsedFoodItem[] | null },
): string {
  return buildMealReminderPushContent(meal).body;
}

function mealReminderItemLines(
  meal: Pick<ParsedMeal, "items"> | { items?: ParsedFoodItem[] | null },
): string[] {
  const items = Array.isArray(meal?.items) ? meal.items : [];
  return items
    .map((item) => formatMealReminderItemLine(item))
    .filter(Boolean);
}

/**
 * Preview na push (+N itens) e itens extras no subtitle (visível ao expandir / pressionar no iOS).
 */
export function buildMealReminderPushContent(
  meal: Pick<ParsedMeal, "items"> | { items?: ParsedFoodItem[] | null },
): { body: string; subtitle: string | null; fullBody: string } {
  const lines = mealReminderItemLines(meal);
  const fullBody = lines.length
    ? lines.join(" · ")
    : "Registre sua refeição no diário alimentar.";

  if (!lines.length) {
    return { body: fullBody, subtitle: null, fullBody };
  }

  const shown = lines.slice(0, MAX_PUSH_ITEMS);
  const hidden = lines.slice(MAX_PUSH_ITEMS);
  let body = shown.join(" · ");
  let subtitle: string | null = null;

  if (hidden.length > 0) {
    body += ` · +${hidden.length} ${hidden.length === 1 ? "item" : "itens"}`;
    subtitle = hidden.join("\n");
  }

  if (body.length > MAX_PUSH_BODY_LENGTH) {
    body = `${body.slice(0, MAX_PUSH_BODY_LENGTH - 1).trimEnd()}…`;
  }

  return { body, subtitle, fullBody };
}
