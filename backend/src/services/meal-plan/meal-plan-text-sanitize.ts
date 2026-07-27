import type { ParsedFoodItem, ParsedMealPlan } from "../../types/meal-plan.types";

/** Marca início de bloco que NÃO é alimento/substituição. */
export const MEAL_PLAN_SECTION_STOP_RE =
  /^(Observa[cç][õo]es|Modo de preparo|Ingredientes|Preparo|Receita|Relat[oó]rio de nutrientes|Lista de compras|Card[aá]pio|Prescri[cç][aã]o)/i;

export const INLINE_SECTION_CUT_RE =
  /\b(Observa[cç][õo]es\s*:|Modo de preparo\s*:|Ingredientes\s*:|Preparo\s*:)/i;

/** Rodapé / relatório Dietbox colado no fim de uma linha de alimento. */
export const INLINE_PDF_NOISE_CUT_RE =
  /\b(?:--\s*\d+\s+of\s+\d+\s+--|Nutricionista\s+CRN|nutri\.[a-z0-9._-]+@|Rua\s+Doutor|P[aá]gina\s+\d+\/\d+|Paciente\s+[A-Za-zÀ-ÿ].+?\|\s*Prescrito em:|Relat[oó]rio de nutrientes|Refei[cç][aã]o\s+Prote[ií]nas|Total das refei[cç][õo]es|Total de vitaminas|Lista de compras|Acesse o app)/i;

export const MEAL_PLAN_REPORT_NOISE_RE =
  /(?:Nutricionista\s+CRN|nutri\.[a-z0-9._-]+@|Rua\s+Doutor|P[aá]gina\s+\d+\/\d+|Paciente\s+.+\|\s*Prescrito em:|Relat[oó]rio de nutrientes|Refei[cç][aã]o\s+Prote[ií]nas|Total das refei[cç][õo]es|Total de vitaminas|--\s*\d+\s+of\s+\d+\s+--|Prote[ií]nas\s+Lip[ií]deos\s+Carboidratos\s+Calorias|Vit\.\s*[A-Z]|Vitamina\s+[A-Z]|AG\s+Monoinsat|Colesterol|Prescri[cç][aã]o Alimentar)/i;

export const MAX_FOOD_LINE_LENGTH = 160;

const FOOD_PARENS_END_RE = /\((\d+(?:\.\d+)?)\s*(g|ml)\)\s*$/i;
const FOOD_PLAIN_END_RE = /(\d+(?:\.\d+)?)\s*(g|ml)\s*$/i;

export function isMealPlanReportNoise(text: string): boolean {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return false;
  if (MEAL_PLAN_REPORT_NOISE_RE.test(raw)) return true;
  if ((raw.match(/\bKcal\b/gi) || []).length > 1) return true;
  if ((raw.match(/\b\d+(?:\.\d+)?\s*mg\b/gi) || []).length >= 3) return true;
  if ((raw.match(/\b\d+(?:\.\d+)?\s*mcg\b/gi) || []).length >= 2) return true;
  return false;
}

export function isMealPlanSectionStopLine(line: string): boolean {
  const trimmed = String(line || "").replace(/\s+/g, " ").trim();
  if (!trimmed) return true;
  if (MEAL_PLAN_SECTION_STOP_RE.test(trimmed)) return true;
  if (/^-- \d+ of \d+ --$/i.test(trimmed)) return true;
  if (/^P[aá]gina \d+/i.test(trimmed)) return true;
  if (isMealPlanReportNoise(trimmed)) return true;
  return false;
}

export function cutInlineSectionText(text: string): string {
  let cleaned = String(text || "").replace(/\s+/g, " ").trim();

  for (const pattern of [INLINE_PDF_NOISE_CUT_RE, INLINE_SECTION_CUT_RE]) {
    const match = cleaned.match(pattern);
    if (match?.index != null && match.index > 0) {
      cleaned = cleaned.slice(0, match.index).trim();
    }
  }

  return cleaned.replace(/\s+-\s*$/, "").trim();
}

export function looksLikeFoodPortionLine(text: string): boolean {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw || raw.length < 3) return false;
  if (raw.length > MAX_FOOD_LINE_LENGTH) return false;

  const cleaned = cutInlineSectionText(raw);
  if (!cleaned || cleaned.length < 3) return false;
  if (cleaned.length > MAX_FOOD_LINE_LENGTH) return false;
  if (MEAL_PLAN_SECTION_STOP_RE.test(cleaned)) return false;
  if (isMealPlanReportNoise(cleaned)) return false;
  if (/ingredientes\s*:|modo de preparo|preparo\s*:/i.test(cleaned)) return false;
  if (/refogue|mexa bem|cozinhe por|asse por/i.test(cleaned)) return false;
  if (/à vontade/i.test(cleaned)) return true;
  if (FOOD_PARENS_END_RE.test(cleaned)) return true;
  if (FOOD_PLAIN_END_RE.test(cleaned)) return true;
  if (
    /\d+(?:\.\d+)?\s+(unidade|fatia|colher|x[ií]cara|quadradinho|fil[eé]|por[cç][aã]o|medidor|concha|copo|prato)/i.test(cleaned)
  ) {
    return true;
  }
  return false;
}

export function sanitizeFoodDisplay(text: string): string {
  return cutInlineSectionText(text);
}

export function sanitizeParsedFoodItemDisplay(item: ParsedFoodItem): ParsedFoodItem {
  const display = sanitizeFoodDisplay(item.display || item.name || "");
  if (!display) return { ...item, display: "", name: item.name || "" };

  const name = item.name && item.name.length <= display.length
    ? item.name
    : display.split(/\s+-\s+/)[0]?.trim() || item.name || display;

  return {
    ...item,
    name: cutInlineSectionText(name),
    display,
  };
}

export function sanitizeSubstitutionItem(item: ParsedFoodItem): ParsedFoodItem | null {
  const sanitized = sanitizeParsedFoodItemDisplay(item);
  if (!looksLikeFoodPortionLine(sanitized.display)) return null;
  return sanitized;
}

export function sanitizeMealPlanItem(item: ParsedFoodItem): ParsedFoodItem | null {
  const sanitized = sanitizeParsedFoodItemDisplay(item);
  if (!looksLikeFoodPortionLine(sanitized.display)) return null;
  return sanitized;
}

export function sanitizeMealPlanSubstitutions(plan: ParsedMealPlan): ParsedMealPlan {
  for (const meal of plan.meals || []) {
    meal.items = (meal.items || [])
      .map((item) => {
        const sanitized = sanitizeMealPlanItem(item);
        if (!sanitized) return null;

        sanitized.substitutions = (item.substitutions || [])
          .map((sub) => sanitizeSubstitutionItem(sub))
          .filter((sub): sub is ParsedFoodItem => Boolean(sub));

        return sanitized;
      })
      .filter((item): item is ParsedFoodItem => Boolean(item));
  }
  return plan;
}

/** Insere quebras quando o PDF Dietbox vem colado em uma linha só. */
export function normalizePdfExtractedText(text: string): string {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/\s+(?=\d{2}:\d{2}\s*-)/g, "\n")
    .replace(/\s+(?=--\s+\d+\s+of\s+\d+\s+--)/gi, "\n")
    .replace(/\s+(?=Relat[oó]rio de nutrientes)/gi, "\n")
    .replace(/\s+(?=Nutricionista\s+CRN)/gi, "\n")
    .replace(/\s+(?=P[aá]gina\s+\d+\/\d+)/gi, "\n")
    .replace(/\s+(?=Lista de compras)/gi, "\n");
}
