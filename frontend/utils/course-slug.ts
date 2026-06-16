const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_RE.test(String(value || '').trim())
}

export function slugify(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

type SluggableItem = { id: string; title?: string | null; order?: number }

export function assignSlugs<T extends SluggableItem>(items: T[]): Map<string, string> {
  const used = new Map<string, number>()
  const result = new Map<string, string>()

  for (const item of items) {
    const base = slugify(item.title || '') || `item-${(item.order ?? 0) + 1}`
    const count = (used.get(base) ?? 0) + 1
    used.set(base, count)
    result.set(item.id, count === 1 ? base : `${base}-${count}`)
  }

  return result
}

export function getModuleSlug(module: SluggableItem, modules?: SluggableItem[]): string {
  if (!module?.id) return ''
  if (modules?.length) {
    const slugs = assignSlugs(modules)
    return slugs.get(module.id) || module.id
  }
  return module.id
}

export function findModuleBySlug<T extends SluggableItem>(modules: T[], slug: string): T | null {
  if (!slug || !modules?.length) return null

  if (isUuid(slug)) {
    return modules.find((module) => module.id === slug) ?? null
  }

  const slugs = assignSlugs(modules)
  const byAssignedSlug = modules.find((module) => slugs.get(module.id) === slug)
  if (byAssignedSlug) return byAssignedSlug

  return modules.find((module) => slugify(module.title || '') === slug) ?? null
}

export function getLessonSlug(lesson: SluggableItem, lessons: SluggableItem[]): string {
  const slugs = assignSlugs(lessons)
  return slugs.get(lesson.id) || lesson.id
}

export function findLessonBySlug<T extends SluggableItem>(lessons: T[], slug: string): T | null {
  if (!slug || !lessons?.length) return null

  const slugs = assignSlugs(lessons)
  const bySlug = lessons.find((lesson) => slugs.get(lesson.id) === slug)
  if (bySlug) return bySlug

  if (isUuid(slug)) {
    return lessons.find((lesson) => lesson.id === slug) ?? null
  }

  return null
}

export function buildModuleUrl(
  module: SluggableItem | null | undefined,
  lesson?: SluggableItem | null,
  lessons?: SluggableItem[],
  courseModules?: SluggableItem[],
): string {
  if (!module) return '/modulos'

  const moduleSlug = getModuleSlug(module, courseModules)
  let url = `/modulos/${encodeURIComponent(moduleSlug)}`

  if (lesson && lessons?.length) {
    const lessonSlug = getLessonSlug(lesson, lessons)
    url += `?aula=${encodeURIComponent(lessonSlug)}`
  }

  return url
}
