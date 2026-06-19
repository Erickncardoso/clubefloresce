import type {
  MealPlanMealMacros,
  MealPlanNutritionTotals,
  ParsedFoodItem,
  ParsedMeal,
  ParsedMealPlan,
} from "../../types/meal-plan.types";

const MEAL_HEADER_RE = /^(\d{2}:\d{2})\s*-\s*(.+)$/;
const PAGE_NOISE_RE =
  /^(Isabella Jardim|Nutricionista CRN|nutri\.|Rua Doutor|Página \d|-- \d+ of \d+ --|Planejamento alimentar|Prescri[cç][aã]o Alimentar|Acesse o app)/i;
const META_PATIENT_RE = /Paciente\s*[:\-]?\s*(.+?)\s*\|\s*Prescrito em:\s*([\d/]+)/i;
const SUB_HEADER_RE = /^[•*]?\s*Op[cç][õo]es de substitui[cç][aã]o para\s+(.+?):\s*$/i;
const FOOD_PARENS_END_RE = /\((\d+(?:\.\d+)?)(g|ml)\)\s*$/i;
const FOOD_PLAIN_END_RE = /(\d+(?:\.\d+)?)(g|ml)\s*$/i;

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function cleanLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function isNoiseLine(line: string): boolean {
  return PAGE_NOISE_RE.test(line) || /^Cardápio/i.test(line);
}

function normalizeFractions(value: string): string {
  return value.replace(/½/g, "0.5").replace(/¼/g, "0.25").replace(/¾/g, "0.75");
}

function parseQuantityTail(body: string): { name: string; amount: number | null; unit: string } {
  const normalized = normalizeFractions(body.trim());

  const avontade = /à vontade/i.test(normalized);
  if (avontade) {
    const name = normalized.replace(/\s*à vontade.*$/i, "").replace(/\s+\d+.*$/, "").trim();
    return { name: name || normalized, amount: null, unit: "avontade" };
  }

  const qtyMatch = normalized.match(
    /^(.*?)\s+(\d+(?:\.\d+)?)\s+(Unidade\(s\)|unidades?|fatia\(s\)|Fatia\(s\)|Colher\(es\)|colheres?|colher|Medidor\(es\)|Porção\(ões\)|Prato\(s\)|Filé\(s\)|Xícara\(s\)|Xicara\(s\)|Medida\(s\)|Dosador\(es\)|Concha\(s\)|Copo\(s\))(?:\s+.+)?$/i,
  );

  if (qtyMatch) {
    const unitRaw = qtyMatch[3].toLowerCase();
    let unit = "unidade";
    if (unitRaw.includes("fatia")) unit = "fatia";
    else if (unitRaw.includes("colher") || unitRaw.includes("medidor")) unit = "colher";
    else if (unitRaw.includes("xícara") || unitRaw.includes("xicara")) unit = "xicara";
    else if (unitRaw.includes("prato") || unitRaw.includes("porção") || unitRaw.includes("porcao")) unit = "porcao";
    else if (unitRaw.includes("filé") || unitRaw.includes("file")) unit = "file";
    else if (unitRaw.includes("dosador")) unit = "dosador";
    else if (unitRaw.includes("concha")) unit = "concha";
    else if (unitRaw.includes("copo")) unit = "copo";

    return {
      name: qtyMatch[1].trim(),
      amount: Number(qtyMatch[2]),
      unit,
    };
  }

  return { name: normalized, amount: null, unit: "porcao" };
}

function buildFoodItem(raw: string, substitutions: ParsedFoodItem[] = []): ParsedFoodItem | null {
  const text = normalizeFractions(raw.replace(/\s+/g, " ").trim());
  if (!text || SUB_HEADER_RE.test(text) || MEAL_HEADER_RE.test(text)) return null;

  if (/à vontade/i.test(text) && !FOOD_PARENS_END_RE.test(text) && !FOOD_PLAIN_END_RE.test(text)) {
    const name = text.replace(/\s*-\s*.*à vontade.*$/i, "").replace(/\s+à vontade.*$/i, "").trim();
    const key = slugify(name || text);
    return {
      key,
      name: name || text,
      amount: null,
      unit: "avontade",
      grams: null,
      ml: null,
      display: text,
      substitutions,
    };
  }

  const parensMatch = text.match(/^(.*)\((\d+(?:\.\d+)?)(g|ml)\)\s*$/i);
  if (parensMatch) {
    const body = parensMatch[1].trim();
    const measure = Number(parensMatch[2]);
    const measureUnit = parensMatch[3].toLowerCase();
    const { name, amount, unit } = parseQuantityTail(body);

    return {
      key: slugify(name),
      name,
      amount,
      unit,
      grams: measureUnit === "g" ? measure : null,
      ml: measureUnit === "ml" ? measure : null,
      display: text,
      substitutions,
    };
  }

  const plainMatch = text.match(/^(.*)(\d+(?:\.\d+)?)(g|ml)\s*$/i);
  if (plainMatch) {
    const body = plainMatch[1].trim();
    const measure = Number(plainMatch[2]);
    const measureUnit = plainMatch[3].toLowerCase();
    const { name, amount, unit } = parseQuantityTail(body);

    return {
      key: slugify(name),
      name,
      amount,
      unit,
      grams: measureUnit === "g" ? measure : null,
      ml: measureUnit === "ml" ? measure : null,
      display: text,
      substitutions,
    };
  }

  return null;
}

function parseSubstitutionOptions(raw: string): ParsedFoodItem[] {
  const chunks = raw
    .split(/\s+-\s+ou\s+-\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  return chunks
    .map((chunk) => buildFoodItem(chunk.replace(/^-\s*/, "")))
    .filter((item): item is ParsedFoodItem => Boolean(item));
}

function extractMeta(text: string): { title: string | null; patientName: string | null; prescribedAt: string | null } {
  const lines = cleanLines(text);
  const title =
    lines.find((line) => /^Cardápio|^Prescri[cç][aã]o Alimentar/i.test(line)) || null;

  const metaPatterns = [
    /Paciente\s*[:\-]?\s*(.+?)\s*\|\s*Prescrito em:\s*([\d/]+)/i,
    /P[aá]gina\s+\d+[^|]*\|\s*Paciente\s+(.+?)\s*\|\s*Prescrito em:\s*([\d/]+)/i,
    /Paciente\s*[:\-]\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.'-]{2,})(?:\s*$|\s*\|)/i,
    /Paciente\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.'-]{2,})(?:\s*\|\s*Prescrito|\s*$)/i,
  ];

  for (const pattern of metaPatterns) {
    const metaLine = lines.find((line) => pattern.test(line));
    const metaMatch = metaLine?.match(pattern);
    if (!metaMatch?.[1]) continue;

    const patientName = metaMatch[1].replace(/[.|,;:]+$/g, "").trim();
    const prescribedAt = metaMatch[2]?.replace(/[.|,;:]+$/g, "").trim() || null;

    if (patientName) {
      return { title, patientName, prescribedAt };
    }
  }

  return { title, patientName: null, prescribedAt: null };
}

function trimMealPlanText(text: string): string {
  const reportIdx = text.search(/Relat[oó]rio de nutrientes/i);
  const shoppingIdx = text.search(/Lista de compras/i);
  let end = text.length;
  if (reportIdx >= 0) end = Math.min(end, reportIdx);
  if (shoppingIdx >= 0) end = Math.min(end, shoppingIdx);
  return text.slice(0, end);
}

const MEAL_MACRO_ROW_RE =
  /^(.+?)\s+(\d+(?:\.\d+)?)\s*g\s+(\d+(?:\.\d+)?)\s*g\s+(\d+(?:\.\d+)?)\s*g\s+(\d+(?:\.\d+)?)\s*Kcal\s*$/i;

const TOTAL_MACRO_ROW_RE =
  /^Total das refeições\s+(\d+(?:\.\d+)?)\s*g\s+(\d+(?:\.\d+)?)\s*g\s+(\d+(?:\.\d+)?)\s*g\s+(\d+(?:\.\d+)?)\s*Kcal\s*$/i;

function normalizeMealLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function extractNutritionReport(text: string): {
  totals: MealPlanNutritionTotals | null;
  mealMacros: Array<{ label: string; macros: MealPlanMealMacros }>;
} {
  const lines = cleanLines(text);
  let totals: MealPlanNutritionTotals | null = null;
  const mealMacros: Array<{ label: string; macros: MealPlanMealMacros }> = [];

  for (const line of lines) {
    const totalMatch = line.match(TOTAL_MACRO_ROW_RE);
    if (totalMatch) {
      totals = {
        proteinG: Number(totalMatch[1]),
        fatG: Number(totalMatch[2]),
        carbsG: Number(totalMatch[3]),
        caloriesKcal: Math.round(Number(totalMatch[4])),
      };
      continue;
    }

    const mealMatch = line.match(MEAL_MACRO_ROW_RE);
    if (!mealMatch) continue;

    const label = mealMatch[1].trim();
    if (/^Refeição|Proteínas|Total/i.test(label)) continue;

    mealMacros.push({
      label,
      macros: {
        proteinG: Number(mealMatch[2]),
        fatG: Number(mealMatch[3]),
        carbsG: Number(mealMatch[4]),
        caloriesKcal: Math.round(Number(mealMatch[5])),
      },
    });
  }

  return { totals, mealMacros };
}

function attachMealMacros(
  meals: ParsedMeal[],
  mealMacros: Array<{ label: string; macros: MealPlanMealMacros }>,
): void {
  if (!mealMacros.length) return;

  for (const meal of meals) {
    const mealNorm = normalizeMealLabel(meal.label);
    const match = mealMacros.find((entry) => {
      const entryNorm = normalizeMealLabel(entry.label);
      return entryNorm === mealNorm
        || mealNorm.includes(entryNorm)
        || entryNorm.includes(mealNorm);
    });

    if (match) {
      meal.macros = match.macros;
    }
  }
}

export function parseDietboxMealPlan(text: string, fileName: string): ParsedMealPlan {
  const meta = extractMeta(text);
  const nutrition = extractNutritionReport(text);
  const lines = cleanLines(trimMealPlanText(text)).filter((line) => !isNoiseLine(line));

  const meals: ParsedMeal[] = [];
  let currentMeal: ParsedMeal | null = null;
  let itemBuffer: string[] = [];
  let pendingSubTarget: string | null = null;
  let pendingSubLines: string[] = [];

  const flushItemBuffer = () => {
    if (!currentMeal || !itemBuffer.length) {
      itemBuffer = [];
      return;
    }

    const joined = itemBuffer.join(" ").replace(/\s+/g, " ").trim();
    itemBuffer = [];

    const item = buildFoodItem(joined);
    if (item) currentMeal.items.push(item);
  };

  const attachPendingSubstitutions = () => {
    if (!currentMeal || !pendingSubTarget || !pendingSubLines.length) {
      pendingSubTarget = null;
      pendingSubLines = [];
      return;
    }

    const options = parseSubstitutionOptions(pendingSubLines.join(" "));
    const targetNorm = pendingSubTarget.toLowerCase();
    const item = currentMeal.items.find((entry) => entry.name.toLowerCase().includes(targetNorm.split("(")[0].trim()));

    if (item) {
      item.substitutions = options;
    }

    pendingSubTarget = null;
    pendingSubLines = [];
  };

  for (const line of lines) {
    if (/^Relat[oó]rio de nutrientes/i.test(line)) {
      flushItemBuffer();
      attachPendingSubstitutions();
      break;
    }

    const mealMatch = line.match(MEAL_HEADER_RE);
    if (mealMatch) {
      flushItemBuffer();
      attachPendingSubstitutions();

      const time = mealMatch[1];
      const label = mealMatch[2].trim();
      currentMeal = {
        id: slugify(`${time}-${label}`),
        time,
        label,
        items: [],
      };
      meals.push(currentMeal);
      continue;
    }

    const subMatch = line.match(SUB_HEADER_RE);
    if (subMatch) {
      flushItemBuffer();
      attachPendingSubstitutions();
      pendingSubTarget = subMatch[1].trim();
      pendingSubLines = [];
      continue;
    }

    if (pendingSubTarget) {
      if (MEAL_HEADER_RE.test(line)) {
        attachPendingSubstitutions();
        continue;
      }
      pendingSubLines.push(line);
      continue;
    }

    if (!currentMeal) continue;

    const combined = [...itemBuffer, line].join(" ");
    if (FOOD_PARENS_END_RE.test(combined) || (FOOD_PLAIN_END_RE.test(combined) && !/refogada sem$/i.test(combined))) {
      itemBuffer.push(line);
      flushItemBuffer();
      continue;
    }

    if (/à vontade/i.test(line) && !itemBuffer.length) {
      const item = buildFoodItem(line);
      if (item) currentMeal.items.push(item);
      continue;
    }

    itemBuffer.push(line);
  }

  flushItemBuffer();
  attachPendingSubstitutions();

  const mealsWithItems = meals.filter((meal) => meal.items.length > 0);
  if (!mealsWithItems.length) {
    throw new Error("Não foi possível identificar refeições no PDF. Verifique se é um planejamento alimentar exportado em texto.");
  }

  attachMealMacros(mealsWithItems, nutrition.mealMacros);

  return {
    title: meta.title || "Planejamento alimentar",
    patientName: meta.patientName,
    prescribedAt: meta.prescribedAt,
    fileName,
    meals: mealsWithItems,
    nutritionTotals: nutrition.totals ?? undefined,
    parserSource: "dietbox",
  };
}
