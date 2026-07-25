import { randomUUID } from "crypto";
import { AppSettingRepository } from "../repositories/app-setting.repository";

export const PATIENT_TAGS_CATALOG_KEY = "patient_tags_catalog";

export const PATIENT_TAG_COLORS = [
  "#8B967C",
  "#DC2626",
  "#EA580C",
  "#CA8A04",
  "#16A34A",
  "#0891B2",
  "#2563EB",
  "#4F46E5",
  "#DB2777",
  "#64748B",
  "#92400E",
] as const;

export type PatientTagCatalogItem = {
  id: string;
  name: string;
  color: string;
};

function normalizeName(value: unknown): string {
  return String(value || "").trim().slice(0, 40);
}

function normalizeColor(value: unknown): string {
  const raw = String(value || "").trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(raw)) return raw;
  return PATIENT_TAG_COLORS[0];
}

function parseCatalog(raw: string | null): PatientTagCatalogItem[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const name = normalizeName(item?.name);
        if (!name) return null;
        return {
          id: String(item?.id || randomUUID()),
          name,
          color: normalizeColor(item?.color),
        } satisfies PatientTagCatalogItem;
      })
      .filter(Boolean) as PatientTagCatalogItem[];
  } catch {
    return [];
  }
}

export class PatientTagsCatalogService {
  private readonly settings = new AppSettingRepository();

  async list(): Promise<PatientTagCatalogItem[]> {
    const raw = await this.settings.get(PATIENT_TAGS_CATALOG_KEY);
    return parseCatalog(raw).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  async create(input: { name: string; color?: string }): Promise<PatientTagCatalogItem> {
    const name = normalizeName(input.name);
    if (!name) throw new Error("Informe o nome da tag.");

    const color = normalizeColor(input.color);
    const current = await this.list();
    const exists = current.find((tag) => tag.name.toLowerCase() === name.toLowerCase());

    if (exists) {
      if (exists.color === color) return exists;
      const updated = current
        .map((tag) => (tag.id === exists.id ? { ...tag, color } : tag))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      await this.settings.set(PATIENT_TAGS_CATALOG_KEY, JSON.stringify(updated));
      return updated.find((tag) => tag.id === exists.id)!;
    }

    if (current.length >= 100) throw new Error("Limite de tags atingido.");

    const next: PatientTagCatalogItem = {
      id: randomUUID(),
      name,
      color,
    };
    const updated = [...current, next].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    await this.settings.set(PATIENT_TAGS_CATALOG_KEY, JSON.stringify(updated));
    return next;
  }

  async remove(tagId: string): Promise<boolean> {
    const id = String(tagId || "").trim();
    if (!id) throw new Error("Tag inválida.");

    const current = await this.list();
    const next = current.filter((tag) => tag.id !== id);
    if (next.length === current.length) return false;

    await this.settings.set(PATIENT_TAGS_CATALOG_KEY, JSON.stringify(next));
    return true;
  }

  /** Garante que tags do perfil do paciente existam no catálogo global. */
  async ensureFromPatientProfile(profile: {
    tagItems?: Array<{ id?: string; name?: string; color?: string }> | null;
    tags?: string[] | null;
  } | null | undefined): Promise<void> {
    if (!profile) return;

    const items: Array<{ name: string; color?: string }> = [];
    if (Array.isArray(profile.tagItems)) {
      for (const item of profile.tagItems) {
        const name = normalizeName(item?.name);
        if (name) items.push({ name, color: item?.color });
      }
    }
    if (!items.length && Array.isArray(profile.tags)) {
      for (const tag of profile.tags) {
        const name = normalizeName(tag);
        if (name) items.push({ name });
      }
    }
    if (!items.length) return;

    for (const item of items) {
      await this.create(item);
    }
  }
}

export const patientTagsCatalogService = new PatientTagsCatalogService();
