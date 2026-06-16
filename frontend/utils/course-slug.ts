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

type SluggableItem = { id: string; title?: string | null; order?: number; courseId?: string }

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

export function getModuleSlug(module: SluggableItem, _modules?: SluggableItem[]): string {
  return module?.id || ''
}

export function findModuleBySlug<T extends SluggableItem>(modules: T[], slug: string): T | null {
  if (!slug || !modules?.length) return null
  if (isUuid(slug)) {
    return modules.find((module) => module.id === slug) ?? null
  }

  const orderMatch = /^modulo-(\d+)$/.exec(slug)
  if (orderMatch) {
    const index = Number(orderMatch[1]) - 1
    const sorted = [...modules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    if (index >= 0 && index < sorted.length) return sorted[index]
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

  return lessons.find((lesson) => slugify(lesson.title || '') === slug) ?? null
}

function resolveCourseId(
  module?: SluggableItem | null,
  course?: { id?: string } | string | null,
): string | null {
  if (typeof course === 'string') return course
  if (course?.id) return course.id
  if (module?.courseId) return module.courseId
  return null
}

export function buildModuleUrl(
  module: SluggableItem | null | undefined,
  lesson?: SluggableItem | null,
  lessons?: SluggableItem[],
  course?: { id?: string } | string | null,
): string {
  if (!module?.id) return '/modulos'

  const params = new URLSearchParams()
  const courseId = resolveCourseId(module, course)
  if (courseId) params.set('curso', courseId)

  if (lesson && lessons?.length) {
    params.set('aula', getLessonSlug(lesson, lessons))
  }

  let url = `/modulos/${encodeURIComponent(module.id)}`
  const qs = params.toString()
  if (qs) url += `?${qs}`
  return url
}
