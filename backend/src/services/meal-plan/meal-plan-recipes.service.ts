import { randomUUID } from "crypto";
import { AppSettingRepository } from "../../repositories/app-setting.repository";
import type { MealPlanRecipe, MealPlanRecipeIngredient } from "../../types/meal-plan-recipe.types";

export const MEAL_PLAN_RECIPES_KEY = "meal_plan_recipes";
const MAX_RECIPES = 120;
const MAX_INGREDIENTS = 40;

function normalizeText(value: unknown, max: number): string {
  return String(value || "").trim().slice(0, max);
}

function parseIngredient(raw: unknown): MealPlanRecipeIngredient | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const name = normalizeText(row.name, 160);
  if (!name) return null;
  const per100g = row.per100g && typeof row.per100g === "object"
    ? {
        caloriesKcal: numOrNull((row.per100g as Record<string, unknown>).caloriesKcal),
        proteinG: numOrNull((row.per100g as Record<string, unknown>).proteinG),
        carbsG: numOrNull((row.per100g as Record<string, unknown>).carbsG),
        fatG: numOrNull((row.per100g as Record<string, unknown>).fatG),
        fiberG: numOrNull((row.per100g as Record<string, unknown>).fiberG),
        sodiumMg: numOrNull((row.per100g as Record<string, unknown>).sodiumMg),
      }
    : null;

  return {
    id: normalizeText(row.id, 80) || randomUUID(),
    foodId: normalizeText(row.foodId, 80) || null,
    foodSource:
      row.foodSource === "TACO" || row.foodSource === "TBCA" || row.foodSource === "CUSTOM"
        ? row.foodSource
        : null,
    name,
    amount: normalizeText(row.amount, 24) || "1",
    unit: normalizeText(row.unit, 40) || "unidade",
    grams: numOrNull(row.grams),
    per100g,
  };
}

function numOrNull(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseRecipe(raw: unknown): MealPlanRecipe | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const title = normalizeText(row.title, 160);
  if (!title) return null;

  const ingredients = (Array.isArray(row.ingredients) ? row.ingredients : [])
    .map(parseIngredient)
    .filter(Boolean)
    .slice(0, MAX_INGREDIENTS) as MealPlanRecipeIngredient[];

  const sharedPatientIds = (Array.isArray(row.sharedPatientIds) ? row.sharedPatientIds : [])
    .map((id) => normalizeText(id, 80))
    .filter(Boolean);

  const now = new Date().toISOString();

  return {
    id: normalizeText(row.id, 80) || randomUUID(),
    title,
    imageUrl: normalizeText(row.imageUrl, 500) || null,
    imagePosition: normalizeText(row.imagePosition, 40) || "50% 50%",
    servingsLabel: normalizeText(row.servingsLabel, 80) || "1 porção",
    prepMinutes: numOrNull(row.prepMinutes),
    shareWithAll: row.shareWithAll === true,
    sharedPatientIds,
    ingredients,
    steps: normalizeText(row.steps, 12000),
    createdAt: normalizeText(row.createdAt, 40) || now,
    updatedAt: now,
  };
}

export class MealPlanRecipesService {
  private readonly settings = new AppSettingRepository();

  private async readAll(): Promise<MealPlanRecipe[]> {
    const raw = await this.settings.get(MEAL_PLAN_RECIPES_KEY);
    if (!raw?.trim()) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(parseRecipe).filter(Boolean) as MealPlanRecipe[];
    } catch {
      return [];
    }
  }

  private async writeAll(recipes: MealPlanRecipe[]) {
    await this.settings.set(MEAL_PLAN_RECIPES_KEY, JSON.stringify(recipes.slice(0, MAX_RECIPES)));
  }

  async list(): Promise<MealPlanRecipe[]> {
    const recipes = await this.readAll();
    return recipes.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  async getById(id: string): Promise<MealPlanRecipe | null> {
    const recipes = await this.readAll();
    return recipes.find((recipe) => recipe.id === id) || null;
  }

  async upsert(input: Partial<MealPlanRecipe> & { title: string }): Promise<MealPlanRecipe> {
    const recipes = await this.readAll();
    const now = new Date().toISOString();
    const existing = input.id ? recipes.find((recipe) => recipe.id === input.id) : null;
    const parsed = parseRecipe({
      ...existing,
      ...input,
      id: input.id || existing?.id || randomUUID(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    });
    if (!parsed) throw new Error("Receita inválida.");

    const next = existing
      ? recipes.map((recipe) => (recipe.id === parsed.id ? parsed : recipe))
      : [parsed, ...recipes];

    await this.writeAll(next);
    return parsed;
  }

  async delete(id: string): Promise<void> {
    const recipes = await this.readAll();
    await this.writeAll(recipes.filter((recipe) => recipe.id !== id));
  }

  async listForPatient(patientId: string): Promise<MealPlanRecipe[]> {
    const id = normalizeText(patientId, 80);
    if (!id) return [];
    const recipes = await this.list();
    return recipes.filter(
      (recipe) => recipe.shareWithAll || (recipe.sharedPatientIds || []).includes(id),
    );
  }
}

export const mealPlanRecipesService = new MealPlanRecipesService();
