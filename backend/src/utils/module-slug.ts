import { isUuid, slugify } from "./slug";

type SluggableModule = { id: string; title?: string | null; order?: number };

export function assignModuleSlugs(modules: SluggableModule[]): Map<string, string> {
  const used = new Map<string, number>();
  const result = new Map<string, string>();
  const sorted = [...modules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  for (const item of sorted) {
    const base = slugify(item.title || "") || `modulo-${(item.order ?? 0) + 1}`;
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    result.set(item.id, count === 1 ? base : `${base}-${count}`);
  }

  return result;
}

export function assignLessonSlugs(lessons: { id: string; title?: string | null; order?: number }[]): Map<string, string> {
  const used = new Map<string, number>();
  const result = new Map<string, string>();

  for (const item of lessons) {
    const base = slugify(item.title || "") || `aula-${(item.order ?? 0) + 1}`;
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    result.set(item.id, count === 1 ? base : `${base}-${count}`);
  }

  return result;
}

export function findModuleBySlug<T extends SluggableModule>(
  modules: T[],
  slug: string,
): T | null {
  if (!slug || !modules.length) return null;

  if (isUuid(slug)) {
    return modules.find((module) => module.id === slug) ?? null;
  }

  const orderMatch = /^modulo-(\d+)$/.exec(slug);
  if (orderMatch) {
    const index = Number(orderMatch[1]) - 1;
    const sorted = [...modules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (index >= 0 && index < sorted.length) return sorted[index];
  }

  const slugs = assignModuleSlugs(modules);
  const byAssignedSlug = modules.find((module) => slugs.get(module.id) === slug);
  if (byAssignedSlug) return byAssignedSlug;

  return modules.find((module) => slugify(module.title || "") === slug) ?? null;
}

export function findLessonBySlug<T extends { id: string; title?: string | null; order?: number }>(
  lessons: T[],
  slug: string,
): T | null {
  if (!slug || !lessons.length) return null;

  if (isUuid(slug)) {
    return lessons.find((lesson) => lesson.id === slug) ?? null;
  }

  const slugs = assignLessonSlugs(lessons);
  const byAssignedSlug = lessons.find((lesson) => slugs.get(lesson.id) === slug);
  if (byAssignedSlug) return byAssignedSlug;

  return lessons.find((lesson) => slugify(lesson.title || "") === slug) ?? null;
}
