import { randomUUID } from "crypto";
import { AppSettingRepository } from "../../repositories/app-setting.repository";
import type { MealPlanQualitativeTemplate } from "../../types/meal-plan-qualitative-template.types";

export const MEAL_PLAN_QUALITATIVE_TEMPLATES_KEY = "meal_plan_qualitative_templates";
const MAX_TEMPLATES = 40;
const MAX_HTML = 80000;
const MAX_TEXT = 50000;
const MAX_TITLE = 160;
const MAX_NOTES = 8000;

function normalizeText(value: unknown, max: number): string {
  return String(value || "").trim().slice(0, max);
}

function htmlToPlain(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseTemplate(raw: unknown): MealPlanQualitativeTemplate | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const title = normalizeText(row.title, MAX_TITLE);
  if (!title) return null;

  const editorHtml = normalizeText(row.editorHtml || row.content, MAX_HTML);
  const editorText = normalizeText(row.editorText, MAX_TEXT) || htmlToPlain(editorHtml);
  if (!editorHtml && !editorText) return null;

  const now = new Date().toISOString();
  return {
    id: normalizeText(row.id, 80) || randomUUID(),
    title,
    editorHtml,
    editorText,
    finalNotes: normalizeText(row.finalNotes, MAX_NOTES) || null,
    createdAt: normalizeText(row.createdAt, 40) || now,
    updatedAt: now,
  };
}

export class MealPlanQualitativeTemplatesService {
  private readonly settings = new AppSettingRepository();

  private async readAll(): Promise<MealPlanQualitativeTemplate[]> {
    const raw = await this.settings.get(MEAL_PLAN_QUALITATIVE_TEMPLATES_KEY);
    if (!raw?.trim()) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(parseTemplate).filter(Boolean) as MealPlanQualitativeTemplate[];
    } catch {
      return [];
    }
  }

  private async writeAll(templates: MealPlanQualitativeTemplate[]) {
    await this.settings.set(
      MEAL_PLAN_QUALITATIVE_TEMPLATES_KEY,
      JSON.stringify(templates.slice(0, MAX_TEMPLATES)),
    );
  }

  async list(): Promise<MealPlanQualitativeTemplate[]> {
    const templates = await this.readAll();
    return templates.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  async upsert(input: Partial<MealPlanQualitativeTemplate> & { title: string }): Promise<MealPlanQualitativeTemplate> {
    const templates = await this.readAll();
    const existing = input.id ? templates.find((item) => item.id === input.id) : null;
    const parsed = parseTemplate({
      ...existing,
      ...input,
      id: input.id || existing?.id || randomUUID(),
      createdAt: existing?.createdAt,
    });
    if (!parsed) throw new Error("Modelo qualitativo inválido.");

    const next = existing
      ? templates.map((item) => (item.id === parsed.id ? parsed : item))
      : [parsed, ...templates];

    await this.writeAll(next);
    return parsed;
  }

  async delete(id: string): Promise<void> {
    const templates = await this.readAll();
    await this.writeAll(templates.filter((item) => item.id !== id));
  }
}

export const mealPlanQualitativeTemplatesService = new MealPlanQualitativeTemplatesService();
