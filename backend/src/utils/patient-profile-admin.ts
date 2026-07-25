import type {
  PatientGender,
  PatientMaritalStatus,
  PatientModality,
  PatientProfileData,
} from "../types/patient-profile.types";
import { randomUUID } from "crypto";

const GENDERS = new Set<PatientGender>(["female", "male", "other", "prefer_not_say"]);
const MODALITIES = new Set<PatientModality>(["online", "presencial"]);
const MARITAL = new Set<PatientMaritalStatus>([
  "single",
  "married",
  "divorced",
  "widowed",
  "stable_union",
  "other",
]);

const BR_STATES = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

function asObject(value: unknown): PatientProfileData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as PatientProfileData;
}

function parseBirthDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  if (date > now) return null;
  const ageMs = now.getTime() - date.getTime();
  const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
  if (ageYears < 10 || ageYears > 120) return null;
  return value;
}

function onlyDigits(value: unknown, max = 32): string {
  return String(value || "").replace(/\D/g, "").slice(0, max);
}

function parseCpf(value: unknown): string | null {
  const digits = onlyDigits(value, 11);
  if (!digits) return null;
  if (digits.length !== 11) throw new Error("CPF inválido.");
  return digits;
}

function parseZipCode(value: unknown): string | null {
  const digits = onlyDigits(value, 8);
  if (!digits) return null;
  if (digits.length !== 8) throw new Error("CEP inválido.");
  return digits;
}

function parseTags(value: unknown): string[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) throw new Error("Tags inválidas.");
  const tags = value
    .map((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return String((item as { name?: unknown }).name || "").trim();
      }
      return String(item || "").trim();
    })
    .filter(Boolean)
    .slice(0, 20);
  return tags;
}

function parseTagItems(value: unknown): PatientProfileData["tagItems"] {
  if (value == null) return null;
  if (!Array.isArray(value)) throw new Error("Tags inválidas.");
  const items = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const name = String((item as { name?: unknown }).name || "").trim().slice(0, 40);
      if (!name) return null;
      const colorRaw = String((item as { color?: unknown }).color || "").trim().toUpperCase();
      const color = /^#[0-9A-F]{6}$/.test(colorRaw) ? colorRaw : "#8B967C";
      const id = String((item as { id?: unknown }).id || "").trim() || undefined;
      return { id, name, color };
    })
    .filter(Boolean)
    .slice(0, 20) as NonNullable<PatientProfileData["tagItems"]>;
  return items;
}

function parseBool(value: unknown): boolean | null {
  if (value == null || value === "") return null;
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1 || value === "1") return true;
  if (value === "false" || value === 0 || value === "0") return false;
  throw new Error("Valor booleano inválido.");
}

function parseOptionalString(value: unknown, max = 120): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function parseConsultations(value: unknown): PatientProfileData["consultations"] {
  if (value == null) return null;
  if (!Array.isArray(value)) throw new Error("Consultas inválidas.");
  const items = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const dateRaw = String((item as { date?: unknown }).date || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) return null;
      const id = String((item as { id?: unknown }).id || "").trim() || randomUUID();
      const notes = parseOptionalString((item as { notes?: unknown }).notes, 2000);
      const createPlannerTask = Boolean((item as { createPlannerTask?: unknown }).createPlannerTask);
      const createdAtRaw = String((item as { createdAt?: unknown }).createdAt || "").trim();
      const createdAt = createdAtRaw || new Date().toISOString();
      return { id, date: dateRaw, notes, createPlannerTask, createdAt };
    })
    .filter(Boolean)
    .slice(0, 200) as NonNullable<PatientProfileData["consultations"]>;
  return items;
}

function parseAnamneseFormData(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseAnamneseStatus(value: unknown): "draft" | "completed" | null {
  if (value == null || value === "") return null;
  const status = String(value).trim().toLowerCase();
  if (status === "draft" || status === "completed") return status;
  return null;
}

const MEAL_PLAN_METHODOLOGIES = new Set(["foods", "equivalents", "qualitative"]);
const MEAL_PLAN_STATUSES = new Set(["draft", "active", "archived"]);

function parseMealPlanStatus(value: unknown): "draft" | "active" | "archived" | null {
  if (value == null || value === "") return null;
  const status = String(value).trim().toLowerCase();
  if (MEAL_PLAN_STATUSES.has(status)) return status as "draft" | "active" | "archived";
  return null;
}

function parseMealPlanMethodology(value: unknown): "foods" | "equivalents" | "qualitative" | null {
  if (value == null || value === "") return null;
  const method = String(value).trim().toLowerCase();
  if (MEAL_PLAN_METHODOLOGIES.has(method)) return method as "foods" | "equivalents" | "qualitative";
  return null;
}

function parseIsoDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  const raw = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

function parseOptionalNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseMealMacros(value: unknown): NonNullable<NonNullable<PatientProfileData["mealPlans"]>[number]["meals"]>[number]["macros"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const macros = value as Record<string, unknown>;
  const proteinG = parseOptionalNumber(macros.proteinG);
  const fatG = parseOptionalNumber(macros.fatG);
  const carbsG = parseOptionalNumber(macros.carbsG);
  const caloriesKcal = parseOptionalNumber(macros.caloriesKcal);
  if (proteinG == null && fatG == null && carbsG == null && caloriesKcal == null) return null;
  return { proteinG, fatG, carbsG, caloriesKcal };
}

function parseNutritionTotals(value: unknown): NonNullable<PatientProfileData["mealPlans"]>[number]["nutritionTotals"] {
  return parseMealMacros(value);
}

function parseMealPlanMeals(value: unknown): NonNullable<NonNullable<PatientProfileData["mealPlans"]>[number]["meals"]> {
  if (value == null) return [];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const id = String((item as { id?: unknown }).id || "").trim() || randomUUID();
      const time = parseOptionalString((item as { time?: unknown }).time, 8) || "08:00";
      const label = parseOptionalString((item as { label?: unknown }).label, 120) || "Refeição";
      const notes = parseOptionalString((item as { notes?: unknown }).notes, 2000);
      const itemsRaw = (item as { items?: unknown }).items;
      const items = Array.isArray(itemsRaw)
        ? itemsRaw
            .map((food) => {
              if (!food || typeof food !== "object" || Array.isArray(food)) return null;
              const foodId = String((food as { id?: unknown }).id || "").trim() || randomUUID();
              const catalogFoodId = parseOptionalString((food as { foodId?: unknown }).foodId, 80);
              const linkedFoodName = parseOptionalString((food as { linkedFoodName?: unknown }).linkedFoodName, 200);
              const foodSourceRaw = parseOptionalString((food as { foodSource?: unknown }).foodSource, 16);
              const foodSource =
                foodSourceRaw === "TACO" || foodSourceRaw === "TBCA" || foodSourceRaw === "CUSTOM"
                  ? foodSourceRaw
                  : null;
              const name = parseOptionalString((food as { name?: unknown }).name, 200) || "";
              const amount = parseOptionalString((food as { amount?: unknown }).amount, 32) || "";
              const unit = parseOptionalString((food as { unit?: unknown }).unit, 32) || "";
              const groupId = parseOptionalString((food as { groupId?: unknown }).groupId, 40);
              const options = parseOptionalString((food as { options?: unknown }).options, 500);
              const display = parseOptionalString((food as { display?: unknown }).display, 300);
              const grams = parseOptionalNumber((food as { grams?: unknown }).grams);
              const ml = parseOptionalNumber((food as { ml?: unknown }).ml);
              const portionAmount = parseOptionalNumber((food as { portionAmount?: unknown }).portionAmount);
              const portionMeasure = parseOptionalString((food as { portionMeasure?: unknown }).portionMeasure, 40);
              const per100gRaw = (food as { per100g?: unknown }).per100g;
              const per100g =
                per100gRaw && typeof per100gRaw === "object" && !Array.isArray(per100gRaw)
                  ? {
                      caloriesKcal: parseOptionalNumber((per100gRaw as { caloriesKcal?: unknown }).caloriesKcal),
                      proteinG: parseOptionalNumber((per100gRaw as { proteinG?: unknown }).proteinG),
                      carbsG: parseOptionalNumber((per100gRaw as { carbsG?: unknown }).carbsG),
                      fatG: parseOptionalNumber((per100gRaw as { fatG?: unknown }).fatG),
                      fiberG: parseOptionalNumber((per100gRaw as { fiberG?: unknown }).fiberG),
                      sodiumMg: parseOptionalNumber((per100gRaw as { sodiumMg?: unknown }).sodiumMg),
                    }
                  : null;
              if (!name) return null;
              return {
                id: foodId,
                foodId: catalogFoodId,
                linkedFoodName,
                foodSource,
                name,
                amount,
                unit,
                groupId,
                options,
                display,
                grams,
                ml,
                portionAmount,
                portionMeasure,
                per100g,
              };
            })
            .filter(Boolean)
            .slice(0, 80)
        : [];
      const macros = parseMealMacros((item as { macros?: unknown }).macros);
      const pdfMacros = parseMealMacros((item as { pdfMacros?: unknown }).pdfMacros) || macros;
      return { id, time, label, items, notes, macros, pdfMacros };
    })
    .filter(Boolean)
    .slice(0, 24) as NonNullable<NonNullable<PatientProfileData["mealPlans"]>[number]["meals"]>;
}

function parseOptionalJsonObject(value: unknown, maxKeys = 40): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>).slice(0, maxKeys);
  if (!entries.length) return null;
  return Object.fromEntries(entries);
}

function parseHydrationLogs(value: unknown): PatientProfileData["hydrationLogs"] {
  if (value == null) return null;
  if (!Array.isArray(value)) throw new Error("Registros de hidratação inválidos.");
  const items = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const date = parseIsoDate((item as { date?: unknown }).date);
      const consumedMl = parseOptionalNumber((item as { consumedMl?: unknown }).consumedMl);
      if (!date || consumedMl == null) return null;
      const goalMl = parseOptionalNumber((item as { goalMl?: unknown }).goalMl);
      const sourceRaw = String((item as { source?: unknown }).source || "").trim().toLowerCase();
      const source = sourceRaw === "manual" ? "manual" : "app";
      const id = String((item as { id?: unknown }).id || "").trim() || randomUUID();
      const createdAtRaw = String((item as { createdAt?: unknown }).createdAt || "").trim();
      return {
        id,
        date,
        consumedMl: Math.round(consumedMl),
        goalMl: goalMl != null ? Math.round(goalMl) : null,
        source,
        createdAt: createdAtRaw || new Date().toISOString(),
      };
    })
    .filter(Boolean)
    .slice(0, 400) as NonNullable<PatientProfileData["hydrationLogs"]>;
  return items;
}

function parseHydrationFeedback(value: unknown): PatientProfileData["hydrationFeedback"] {
  if (value == null) return null;
  if (!Array.isArray(value)) throw new Error("Feedback de hidratação inválido.");
  const items = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const message = parseOptionalString((item as { message?: unknown }).message, 2000);
      if (!message) return null;
      const id = String((item as { id?: unknown }).id || "").trim() || randomUUID();
      const createdAtRaw = String((item as { createdAt?: unknown }).createdAt || "").trim();
      const readAtRaw = String((item as { readAt?: unknown }).readAt || "").trim();
      return {
        id,
        message,
        createdAt: createdAtRaw || new Date().toISOString(),
        readAt: readAtRaw || null,
      };
    })
    .filter(Boolean)
    .slice(0, 200) as NonNullable<PatientProfileData["hydrationFeedback"]>;
  return items;
}

function parseMealPlans(value: unknown): PatientProfileData["mealPlans"] {
  if (value == null) return null;
  if (!Array.isArray(value)) throw new Error("Planos alimentares inválidos.");
  const items = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const methodology = parseMealPlanMethodology((item as { methodology?: unknown }).methodology) || "qualitative";
      const title = parseOptionalString((item as { title?: unknown }).title, 160) || "Plano alimentar";
      const status = parseMealPlanStatus((item as { status?: unknown }).status) || "draft";
      const objective = parseOptionalString((item as { objective?: unknown }).objective, 200);
      const dietType = parseOptionalString((item as { dietType?: unknown }).dietType, 80);
      const startDate = parseIsoDate((item as { startDate?: unknown }).startDate);
      const endDate = parseIsoDate((item as { endDate?: unknown }).endDate);
      const indefinite = parseBool((item as { indefinite?: unknown }).indefinite);
      const editorText = parseOptionalString((item as { editorText?: unknown }).editorText, 50000);
      const editorHtml = parseOptionalString((item as { editorHtml?: unknown }).editorHtml, 80000);
      const finalNotes = parseOptionalString((item as { finalNotes?: unknown }).finalNotes, 8000);
      const meals = parseMealPlanMeals((item as { meals?: unknown }).meals);
      const nutritionTotals = parseNutritionTotals((item as { nutritionTotals?: unknown }).nutritionTotals);
      const pdfNutritionTotals =
        parseNutritionTotals((item as { pdfNutritionTotals?: unknown }).pdfNutritionTotals) || nutritionTotals;
      const hydrationPrescription = parseOptionalJsonObject(
        (item as { hydrationPrescription?: unknown }).hydrationPrescription,
        32,
      );
      const shoppingList = parseOptionalJsonObject((item as { shoppingList?: unknown }).shoppingList, 80);
      const authorName = parseOptionalString((item as { authorName?: unknown }).authorName, 120);
      const id = String((item as { id?: unknown }).id || "").trim() || randomUUID();
      const createdAtRaw = String((item as { createdAt?: unknown }).createdAt || "").trim();
      const updatedAtRaw = String((item as { updatedAt?: unknown }).updatedAt || "").trim();
      const now = new Date().toISOString();
      return {
        id,
        title,
        methodology,
        status,
        objective,
        dietType,
        startDate,
        endDate,
        indefinite,
        editorText,
        editorHtml,
        finalNotes,
        meals,
        nutritionTotals,
        pdfNutritionTotals,
        hydrationPrescription,
        shoppingList,
        authorName,
        createdAt: createdAtRaw || now,
        updatedAt: updatedAtRaw || now,
      };
    })
    .filter(Boolean)
    .slice(0, 20) as NonNullable<PatientProfileData["mealPlans"]>;
  return items;
}

function parseOrientacaoStatus(value: unknown): "draft" | "published" | null {
  const status = String(value || "").trim().toLowerCase();
  if (status === "draft" || status === "published") return status;
  return null;
}

function parseAnamneses(value: unknown): PatientProfileData["anamneses"] {
  if (value == null) return null;
  if (!Array.isArray(value)) throw new Error("Anamneses inválidas.");
  const items = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const title = parseOptionalString((item as { title?: unknown }).title, 160) || "Anamnese";
      const content = parseOptionalString((item as { content?: unknown }).content, 20000) || "";
      const interpretation = parseOptionalString((item as { interpretation?: unknown }).interpretation, 8000);
      const foodRestrictions = parseOptionalString(
        (item as { foodRestrictions?: unknown }).foodRestrictions,
        500,
      );
      const formData = parseAnamneseFormData((item as { formData?: unknown }).formData);
      const status = parseAnamneseStatus((item as { status?: unknown }).status) || (formData ? "draft" : "completed");
      const authorName = parseOptionalString((item as { authorName?: unknown }).authorName, 120);
      const id = String((item as { id?: unknown }).id || "").trim() || randomUUID();
      const createdAtRaw = String((item as { createdAt?: unknown }).createdAt || "").trim();
      const updatedAtRaw = String((item as { updatedAt?: unknown }).updatedAt || "").trim();
      const now = new Date().toISOString();
      return {
        id,
        title,
        content,
        interpretation,
        foodRestrictions,
        formData,
        status,
        authorName,
        createdAt: createdAtRaw || now,
        updatedAt: updatedAtRaw || now,
      };
    })
    .filter(Boolean)
    .slice(0, 50) as NonNullable<PatientProfileData["anamneses"]>;
  return items;
}

function parseOrientacoes(value: unknown): PatientProfileData["orientacoes"] {
  if (value == null) return null;
  if (!Array.isArray(value)) throw new Error("Orientações inválidas.");
  const items = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const title = parseOptionalString((item as { title?: unknown }).title, 160) || "Orientação";
      const content = parseOptionalString((item as { content?: unknown }).content, 50000) || "";
      const templateId = parseOptionalString((item as { templateId?: unknown }).templateId, 80);
      const previewModelId = parseOptionalString((item as { previewModelId?: unknown }).previewModelId, 80);
      const status = parseOrientacaoStatus((item as { status?: unknown }).status) || "draft";
      const authorName = parseOptionalString((item as { authorName?: unknown }).authorName, 120);
      const id = String((item as { id?: unknown }).id || "").trim() || randomUUID();
      const createdAtRaw = String((item as { createdAt?: unknown }).createdAt || "").trim();
      const updatedAtRaw = String((item as { updatedAt?: unknown }).updatedAt || "").trim();
      const now = new Date().toISOString();
      return {
        id,
        title,
        content,
        templateId,
        previewModelId,
        status,
        authorName,
        createdAt: createdAtRaw || now,
        updatedAt: updatedAtRaw || now,
      };
    })
    .filter(Boolean)
    .slice(0, 50) as NonNullable<PatientProfileData["orientacoes"]>;
  return items;
}

function parseDocumentos(value: unknown): PatientProfileData["documentos"] {
  if (value == null) return null;
  if (!Array.isArray(value)) throw new Error("Documentos inválidos.");
  const items = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const title = parseOptionalString((item as { title?: unknown }).title, 160) || "Documento";
      const category = parseOptionalString((item as { category?: unknown }).category, 80);
      const content = parseOptionalString((item as { content?: unknown }).content, 50000) || "";
      const templateId = parseOptionalString((item as { templateId?: unknown }).templateId, 80);
      const previewModelId = parseOptionalString((item as { previewModelId?: unknown }).previewModelId, 80);
      const status = parseOrientacaoStatus((item as { status?: unknown }).status) || "draft";
      const authorName = parseOptionalString((item as { authorName?: unknown }).authorName, 120);
      const id = String((item as { id?: unknown }).id || "").trim() || randomUUID();
      const createdAtRaw = String((item as { createdAt?: unknown }).createdAt || "").trim();
      const updatedAtRaw = String((item as { updatedAt?: unknown }).updatedAt || "").trim();
      const now = new Date().toISOString();
      return {
        id,
        category,
        title,
        content,
        templateId,
        previewModelId,
        status,
        authorName,
        createdAt: createdAtRaw || now,
        updatedAt: updatedAtRaw || now,
      };
    })
    .filter(Boolean)
    .slice(0, 50) as NonNullable<PatientProfileData["documentos"]>;
  return items;
}

function parseNumericRecord(value: unknown): Record<string, number | null> | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const next: Record<string, number | null> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    next[String(key)] = parseOptionalNumber(raw);
  }
  return next;
}

function parseBioimpedanceRecord(value: unknown): Record<string, number | string | null> | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const next: Record<string, number | string | null> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (key === "scaleBrand") {
      next.scaleBrand = parseOptionalString(raw, 80) || "Genérica";
      continue;
    }
    if (key === "deviceBrand") {
      next.deviceBrand = parseOptionalString(raw, 40) || "generic";
      continue;
    }
    next[String(key)] = parseOptionalNumber(raw);
  }
  return next;
}

function parseAntropometrias(value: unknown): PatientProfileData["antropometrias"] {
  if (value == null) return null;
  if (!Array.isArray(value)) throw new Error("Avaliações antropométricas inválidas.");
  const items = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const title = parseOptionalString((item as { title?: unknown }).title, 160) || "Avaliação Antropométrica";
      const measuredAt = parseOptionalString((item as { measuredAt?: unknown }).measuredAt, 10)
        || new Date().toISOString().slice(0, 10);
      const heightCm = parseOptionalNumber((item as { heightCm?: unknown }).heightCm);
      const weightKg = parseOptionalNumber((item as { weightKg?: unknown }).weightKg);
      const bilateralCircumferences = (item as { bilateralCircumferences?: unknown }).bilateralCircumferences;
      const dominantSideRaw = String((item as { dominantSide?: unknown }).dominantSide || "left").trim();
      const dominantSide = dominantSideRaw === "right" ? "right" : "left";
      const circumferences = parseNumericRecord((item as { circumferences?: unknown }).circumferences);
      const boneDiameters = parseNumericRecord((item as { boneDiameters?: unknown }).boneDiameters);
      const skinfoldMethod = parseOptionalString((item as { skinfoldMethod?: unknown }).skinfoldMethod, 32) || "none";
      const skinfolds = parseNumericRecord((item as { skinfolds?: unknown }).skinfolds);
      const bioimpedance = parseBioimpedanceRecord((item as { bioimpedance?: unknown }).bioimpedance);
      const patientAppViewRaw = String((item as { patientAppView?: unknown }).patientAppView || "skinfolds");
      const patientAppView = ["skinfolds", "bioimpedance", "both", "none"].includes(patientAppViewRaw)
        ? (patientAppViewRaw as "skinfolds" | "bioimpedance" | "both" | "none")
        : "skinfolds";
      const photosRaw = (item as { photos?: unknown }).photos;
      const photos = photosRaw && typeof photosRaw === "object" && !Array.isArray(photosRaw)
        ? Object.fromEntries(
            Object.entries(photosRaw as Record<string, unknown>).map(([key, photo]) => [
              String(key),
              parseOptionalString(photo, 500),
            ]),
          )
        : null;
      const notes = parseOptionalString((item as { notes?: unknown }).notes, 4000);
      const statusRaw = String((item as { status?: unknown }).status || "draft").trim().toLowerCase();
      const status = statusRaw === "completed" || statusRaw === "published" ? "completed" : "draft";
      const authorName = parseOptionalString((item as { authorName?: unknown }).authorName, 120);
      const id = String((item as { id?: unknown }).id || "").trim() || randomUUID();
      const createdAtRaw = String((item as { createdAt?: unknown }).createdAt || "").trim();
      const updatedAtRaw = String((item as { updatedAt?: unknown }).updatedAt || "").trim();
      const now = new Date().toISOString();
      return {
        id,
        title,
        measuredAt,
        heightCm,
        weightKg,
        bilateralCircumferences: bilateralCircumferences !== false,
        dominantSide,
        circumferences,
        boneDiameters,
        skinfoldMethod,
        skinfolds,
        bioimpedance,
        patientAppView,
        photos,
        notes,
        status,
        authorName,
        createdAt: createdAtRaw || now,
        updatedAt: updatedAtRaw || now,
      };
    })
    .filter(Boolean)
    .slice(0, 50) as NonNullable<PatientProfileData["antropometrias"]>;
  return items;
}

function parseExameBiomarkers(value: unknown): NonNullable<NonNullable<PatientProfileData["exames"]>[number]["biomarkers"]> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const name = parseOptionalString((item as { name?: unknown }).name, 120);
      const num = parseOptionalNumber((item as { value?: unknown }).value);
      if (!name || num == null) return null;
      const markerId = parseOptionalString((item as { markerId?: unknown }).markerId, 80);
      const unit = parseOptionalString((item as { unit?: unknown }).unit, 24) || "—";
      const refMin = parseOptionalNumber((item as { refMin?: unknown }).refMin);
      const refMax = parseOptionalNumber((item as { refMax?: unknown }).refMax);
      const category = parseOptionalString((item as { category?: unknown }).category, 40);
      const id = String((item as { id?: unknown }).id || "").trim() || randomUUID();
      return { id, markerId, name, value: num, unit, refMin, refMax, category };
    })
    .filter(Boolean)
    .slice(0, 80) as NonNullable<NonNullable<PatientProfileData["exames"]>[number]["biomarkers"]>;
}

function parseExames(value: unknown): PatientProfileData["exames"] {
  if (value == null) return null;
  if (!Array.isArray(value)) throw new Error("Exames inválidos.");
  const items = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const title = parseOptionalString((item as { title?: unknown }).title, 160) || "Registro de exame";
      const collectedAt = parseIsoDate((item as { collectedAt?: unknown }).collectedAt)
        || new Date().toISOString().slice(0, 10);
      const labName = parseOptionalString((item as { labName?: unknown }).labName, 120);
      const notes = parseOptionalString((item as { notes?: unknown }).notes, 4000);
      const statusRaw = String((item as { status?: unknown }).status || "completed").trim().toLowerCase();
      const status = statusRaw === "draft" ? "draft" : "completed";
      const authorName = parseOptionalString((item as { authorName?: unknown }).authorName, 120);
      const biomarkers = parseExameBiomarkers((item as { biomarkers?: unknown }).biomarkers);
      const id = String((item as { id?: unknown }).id || "").trim() || randomUUID();
      const createdAtRaw = String((item as { createdAt?: unknown }).createdAt || "").trim();
      const updatedAtRaw = String((item as { updatedAt?: unknown }).updatedAt || "").trim();
      const now = new Date().toISOString();
      return {
        id,
        title,
        collectedAt,
        labName,
        notes,
        status,
        authorName,
        biomarkers,
        createdAt: createdAtRaw || now,
        updatedAt: updatedAtRaw || now,
      };
    })
    .filter(Boolean)
    .slice(0, 30) as NonNullable<PatientProfileData["exames"]>;
  return items;
}

/** Mescla payload admin no perfil existente (campos do cadastro rápido). */
export function mergeAdminPatientProfile(
  current: unknown,
  payload: Record<string, unknown> | null | undefined,
): PatientProfileData {
  const next: PatientProfileData = { ...asObject(current) };
  if (!payload || typeof payload !== "object") return next;

  if ("gender" in payload) {
    const gender = payload.gender;
    if (gender == null || gender === "") next.gender = null;
    else if (GENDERS.has(gender as PatientGender)) next.gender = gender as PatientGender;
    else throw new Error("Gênero inválido.");
  }

  if ("birthDate" in payload) {
    if (payload.birthDate == null || payload.birthDate === "") next.birthDate = null;
    else {
      const parsed = parseBirthDate(payload.birthDate);
      if (!parsed) throw new Error("Data de nascimento inválida.");
      next.birthDate = parsed;
    }
  }

  if ("nickname" in payload) next.nickname = parseOptionalString(payload.nickname, 60);
  if ("cpf" in payload) next.cpf = parseCpf(payload.cpf);
  if ("tags" in payload) next.tags = parseTags(payload.tags);
  if ("tagItems" in payload) {
    next.tagItems = parseTagItems(payload.tagItems);
    if (next.tagItems?.length) {
      next.tags = next.tagItems.map((item) => item.name);
    }
  }
  if ("city" in payload) next.city = parseOptionalString(payload.city, 80);
  if ("occupation" in payload) next.occupation = parseOptionalString(payload.occupation, 80);

  if ("state" in payload) {
    if (payload.state == null || payload.state === "") next.state = null;
    else {
      const uf = String(payload.state).trim().toUpperCase();
      if (!BR_STATES.has(uf)) throw new Error("UF inválida.");
      next.state = uf;
    }
  }

  if ("maritalStatus" in payload) {
    const status = payload.maritalStatus;
    if (status == null || status === "") next.maritalStatus = null;
    else if (MARITAL.has(status as PatientMaritalStatus)) {
      next.maritalStatus = status as PatientMaritalStatus;
    } else throw new Error("Estado civil inválido.");
  }

  if ("modality" in payload) {
    const modality = payload.modality;
    if (modality == null || modality === "") next.modality = null;
    else if (MODALITIES.has(modality as PatientModality)) {
      next.modality = modality as PatientModality;
    } else throw new Error("Modalidade inválida.");
  }

  if ("athlete" in payload) next.athlete = parseBool(payload.athlete);
  if ("pregnant" in payload) next.pregnant = parseBool(payload.pregnant);
  if ("lactating" in payload) next.lactating = parseBool(payload.lactating);

  if ("objective" in payload) next.objective = parseOptionalString(payload.objective, 200);
  if ("notes" in payload) next.notes = parseOptionalString(payload.notes, 2000);
  if ("zipCode" in payload) next.zipCode = parseZipCode(payload.zipCode);
  if ("neighborhood" in payload) next.neighborhood = parseOptionalString(payload.neighborhood, 80);
  if ("street" in payload) next.street = parseOptionalString(payload.street, 120);
  if ("streetNumber" in payload) next.streetNumber = parseOptionalString(payload.streetNumber, 20);
  if ("consultations" in payload) next.consultations = parseConsultations(payload.consultations);
  if ("anamneses" in payload) next.anamneses = parseAnamneses(payload.anamneses);
  if ("orientacoes" in payload) next.orientacoes = parseOrientacoes(payload.orientacoes);
  if ("documentos" in payload) next.documentos = parseDocumentos(payload.documentos);
  if ("antropometrias" in payload) next.antropometrias = parseAntropometrias(payload.antropometrias);
  if ("mealPlans" in payload) next.mealPlans = parseMealPlans(payload.mealPlans);
  if ("exames" in payload) next.exames = parseExames(payload.exames);
  if ("hydrationLogs" in payload) next.hydrationLogs = parseHydrationLogs(payload.hydrationLogs);
  if ("hydrationFeedback" in payload) next.hydrationFeedback = parseHydrationFeedback(payload.hydrationFeedback);

  return next;
}

export function hasAdminProfileContent(profile: PatientProfileData): boolean {
  return Boolean(
    profile.nickname ||
      profile.cpf ||
      (profile.tags && profile.tags.length) ||
      (profile.tagItems && profile.tagItems.length) ||
      profile.city ||
      profile.state ||
      profile.occupation ||
      profile.maritalStatus ||
      profile.modality ||
      profile.gender ||
      profile.birthDate ||
      profile.athlete != null ||
      profile.pregnant != null ||
      profile.lactating != null ||
      profile.objective ||
      profile.notes ||
      profile.zipCode ||
      profile.neighborhood ||
      profile.street ||
      profile.streetNumber ||
      (profile.consultations && profile.consultations.length) ||
      (profile.anamneses && profile.anamneses.length) ||
      (profile.orientacoes && profile.orientacoes.length) ||
      (profile.documentos && profile.documentos.length) ||
      (profile.antropometrias && profile.antropometrias.length) ||
      (profile.mealPlans && profile.mealPlans.length) ||
      (profile.exames && profile.exames.length) ||
      (profile.hydrationLogs && profile.hydrationLogs.length) ||
      (profile.hydrationFeedback && profile.hydrationFeedback.length),
  );
}
