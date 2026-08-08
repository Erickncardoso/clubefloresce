import { apiFetch, apiUpload } from './api'
import { buildModuleUrl } from './course-slug'

export type LessonMaterial = { name: string; url: string }

export type LessonProgress = {
  watched?: boolean
  liked?: boolean
  disliked?: boolean
  favorited?: boolean
}

export type CourseLesson = {
  id: string
  title: string
  videoUrl: string
  content?: string | null
  thumbnail?: string | null
  cover?: string | null
  duration?: string | null
  order?: number
  moduleId: string
  materials?: LessonMaterial[] | null
  transcription?: unknown
  /** Prisma relation — array filtrado por user; às vezes objeto único legado */
  progress?: LessonProgress | LessonProgress[] | null
}

export type LessonComment = {
  id: string
  content: string
  createdAt: string
  likesCount?: number
  likedBy?: { id: string }[]
  author?: {
    id: string
    name?: string | null
    avatar?: string | null
    role?: string | null
  } | null
}

export type CourseModule = {
  id: string
  title: string
  description?: string | null
  thumbnail?: string | null
  order?: number
  courseId: string
  lessons?: CourseLesson[]
}

export type Course = {
  id: string
  title: string
  description?: string | null
  thumbnail?: string | null
  thumbnailMobile?: string | null
  bannerImage?: string | null
  bannerImageMobile?: string | null
  bannerImagePosition?: string | null
  bannerImageMobilePosition?: string | null
  bannerKicker?: string | null
  bannerTitle?: string | null
  bannerSubtitle?: string | null
  bannerCtaText?: string | null
  bannerKickerColor?: string | null
  bannerKickerBg?: string | null
  bannerTitleColor?: string | null
  bannerSubtitleColor?: string | null
  bannerCtaBg?: string | null
  bannerCtaColor?: string | null
  bannerSecondaryBtnBg?: string | null
  bannerSecondaryBtnColor?: string | null
  authorId?: string
  modules?: CourseModule[]
  createdAt?: string
  updatedAt?: string
}

export type Ebook = {
  id: string
  title: string
  description?: string | null
  fileUrl: string
  thumbnail?: string | null
  createdAt?: string
}

export type CoursePayload = {
  title: string
  description?: string | null
  thumbnail?: string | null
  thumbnailMobile?: string | null
  bannerImage?: string | null
  bannerImageMobile?: string | null
  bannerImagePosition?: string | null
  bannerImageMobilePosition?: string | null
  bannerKicker?: string | null
  bannerTitle?: string | null
  bannerSubtitle?: string | null
  bannerCtaText?: string | null
  bannerKickerColor?: string | null
  bannerKickerBg?: string | null
  bannerTitleColor?: string | null
  bannerSubtitleColor?: string | null
  bannerCtaBg?: string | null
  bannerCtaColor?: string | null
  bannerSecondaryBtnBg?: string | null
  bannerSecondaryBtnColor?: string | null
}

export type ContentTile = {
  id: string
  kind: 'course' | 'ebook'
  tone: string
  label: string
  value: string
  meta?: string
  cover?: string
  ariaLabel: string
  isAdd?: boolean
  className?: string
  raw: Course | Ebook | null
}

const DEFAULT_COVER = '/curso-capa-personalizada.png'
const DEFAULT_BANNER_POSITION = '50% 35%'

export const DEFAULT_BANNER_THEME = {
  bannerKickerColor: '#0f172a',
  bannerKickerBg: 'rgba(255,255,255,0.92)',
  bannerTitleColor: '#0f172a',
  bannerSubtitleColor: '#334155',
  bannerCtaBg: '#8b967c',
  bannerCtaColor: '#ffffff',
  bannerSecondaryBtnBg: 'rgba(255,255,255,0.9)',
  bannerSecondaryBtnColor: '#0f172a',
}

export function resolveTileCoverUrl(url: string, width = 390) {
  const value = String(url || '').trim()
  if (!value) return ''
  if (!/res\.cloudinary\.com\//i.test(value) || !value.includes('/upload/')) return value
  if (/\/upload\/[^/]*(?:f_|q_|w_|c_|h_)/.test(value)) return value
  const height = Math.round(width * (4 / 3))
  return value.replace('/upload/', `/upload/f_auto,q_auto,w_${width},h_${height},c_fill/`)
}

export function inferCourseTopic(text: string) {
  const haystack = String(text || '').toLowerCase()
  if (/(culin|cozinh|receita|gastron)/.test(haystack)) return 'recipes'
  if (/(treino|fitness|academia|muscul|exerc)/.test(haystack)) return 'training'
  if (/(mindset|mental|emocional|foco|ansiedade)/.test(haystack)) return 'mindset'
  if (/(nutri|alimenta|dieta|metabol|saúde|saude)/.test(haystack)) return 'nutrition'
  return 'other'
}

export function topicToTone(topic: string) {
  const map: Record<string, string> = {
    nutrition: 'pink',
    recipes: 'orange',
    training: 'green',
    mindset: 'purple',
    other: 'blue',
  }
  return map[topic] || 'blue'
}

export function countCourseLessons(course?: Course | null) {
  return (course?.modules || []).reduce((total, module) => total + (module.lessons?.length || 0), 0)
}

export function formatModuleCount(count: number) {
  const total = Number(count) || 0
  return total === 1 ? '1 módulo' : `${total} módulos`
}

export function formatLessonCount(count: number) {
  const total = Number(count) || 0
  return total === 1 ? '1 aula' : `${total} aulas`
}

export function getCourseCover(course?: Course | null, variant: 'desktop' | 'mobile' = 'desktop') {
  if (!course) return DEFAULT_COVER
  if (variant === 'mobile') return course.thumbnailMobile || course.thumbnail || DEFAULT_COVER
  return course.thumbnail || DEFAULT_COVER
}

export function getCourseBannerCover(course?: Course | null) {
  if (!course) return DEFAULT_COVER
  return course.bannerImage || DEFAULT_COVER
}

export function getCourseBannerPosition(course?: Course | null) {
  return course?.bannerImagePosition || DEFAULT_BANNER_POSITION
}

export function mapCourseToTile(course: Course): ContentTile {
  const modules = course.modules?.length || 0
  const lessons = countCourseLessons(course)
  const metaParts = [formatModuleCount(modules)]
  if (lessons) metaParts.push(formatLessonCount(lessons))
  const topic = inferCourseTopic(`${course.title || ''} ${course.description || ''}`)

  return {
    id: course.id,
    kind: 'course',
    tone: topicToTone(topic),
    label: 'Vídeo',
    value: course.title,
    meta: metaParts.join(' · '),
    cover: resolveTileCoverUrl(getCourseCover(course)),
    ariaLabel: `Abrir vídeo ${course.title}`,
    raw: course,
  }
}

export function mapEbookToTile(ebook: Ebook): ContentTile {
  const topic = inferCourseTopic(`${ebook.title || ''} ${ebook.description || ''}`)
  return {
    id: ebook.id,
    kind: 'ebook',
    tone: topicToTone(topic),
    label: 'E-book',
    value: ebook.title,
    meta: ebook.description ? 'Material para leitura' : 'Leitura',
    cover: resolveTileCoverUrl(ebook.thumbnail || ''),
    ariaLabel: `Abrir ebook ${ebook.title}`,
    raw: ebook,
  }
}

export function buildAddTile(kind: 'course' | 'ebook'): ContentTile {
  return {
    id: `add-${kind}`,
    kind,
    tone: 'blue',
    label: kind === 'course' ? 'Curso' : 'E-book',
    value: kind === 'course' ? 'Novo curso' : 'Novo ebook',
    meta: 'Adicionar',
    ariaLabel: kind === 'course' ? 'Criar novo curso' : 'Adicionar ebook',
    isAdd: true,
    className: 'cf-tile-card--add',
    raw: null,
  }
}

export function buildCoursePayload(data: Partial<CoursePayload> & { title: string }): CoursePayload {
  return {
    title: data.title,
    description: data.description || null,
    thumbnail: data.thumbnail || null,
    thumbnailMobile: data.thumbnailMobile || null,
    bannerImage: data.bannerImage || null,
    bannerImageMobile: data.bannerImageMobile || null,
    bannerImagePosition: data.bannerImagePosition || null,
    bannerImageMobilePosition: data.bannerImageMobilePosition || null,
    bannerKicker: data.bannerKicker || null,
    bannerTitle: data.bannerTitle || null,
    bannerSubtitle: data.bannerSubtitle || null,
    bannerCtaText: data.bannerCtaText || null,
    bannerKickerColor: data.bannerKickerColor || null,
    bannerKickerBg: data.bannerKickerBg || null,
    bannerTitleColor: data.bannerTitleColor || null,
    bannerSubtitleColor: data.bannerSubtitleColor || null,
    bannerCtaBg: data.bannerCtaBg || null,
    bannerCtaColor: data.bannerCtaColor || null,
    bannerSecondaryBtnBg: data.bannerSecondaryBtnBg || null,
    bannerSecondaryBtnColor: data.bannerSecondaryBtnColor || null,
  }
}

export function openCoursePlayerHref(course: Course) {
  const firstModuleWithLesson = (course.modules || []).find((module) => module?.lessons?.length)
  const firstLesson = firstModuleWithLesson?.lessons?.[0]
  if (firstModuleWithLesson?.id && firstLesson?.id) {
    return buildModuleUrl(firstModuleWithLesson, firstLesson, firstModuleWithLesson.lessons, course.id)
  }
  const firstModule = course.modules?.[0]
  if (firstModule?.id) return buildModuleUrl(firstModule, null, firstModule.lessons, course.id)
  return null
}

export async function listCourses() {
  return apiFetch<Course[]>('/courses')
}

export async function createCourse(payload: CoursePayload) {
  return apiFetch<Course>('/courses', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateCourse(id: string, payload: CoursePayload) {
  return apiFetch<Course>(`/courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteCourse(id: string) {
  return apiFetch<void>(`/courses/${id}`, { method: 'DELETE' })
}

export async function ensureFirstModule(courseId: string) {
  return apiFetch<CourseModule>(`/courses/${courseId}/modules/ensure-first`, {
    method: 'POST',
  })
}

export async function createModule(courseId: string, payload: { title: string; description?: string }) {
  return apiFetch<CourseModule>(`/courses/${courseId}/modules`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteModule(courseId: string, moduleId: string) {
  return apiFetch<void>(`/courses/${courseId}/modules/${moduleId}`, { method: 'DELETE' })
}

export async function createLesson(payload: {
  moduleId: string
  title: string
  videoUrl: string
  content?: string | null
  duration?: string | null
  thumbnail?: string | null
  materials?: LessonMaterial[]
  order?: number
}) {
  return apiFetch<CourseLesson>('/courses/lessons', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateLesson(
  lessonId: string,
  payload: Partial<{
    title: string
    videoUrl: string
    content: string | null
    duration: string | null
    thumbnail: string | null
    materials: LessonMaterial[]
    order: number
  }>,
) {
  return apiFetch<CourseLesson>(`/courses/lessons/${lessonId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteLesson(lessonId: string) {
  return apiFetch<void>(`/courses/lessons/${lessonId}`, { method: 'DELETE' })
}

export async function getModule(
  moduleId: string,
  params: { curso?: string; aula?: string } = {},
) {
  const query = new URLSearchParams()
  if (params.curso) query.set('curso', params.curso)
  if (params.aula) query.set('aula', params.aula)
  const suffix = query.toString() ? `?${query}` : ''
  return apiFetch<
    CourseModule & {
      course?: Course
      lessons: CourseLesson[]
    }
  >(`/courses/modules/${moduleId}${suffix}`)
}

export async function updateLessonProgress(
  lessonId: string,
  flags: { watched?: boolean; favorited?: boolean; liked?: boolean; disliked?: boolean },
) {
  return apiFetch<LessonProgress>(`/courses/lessons/${lessonId}/progress`, {
    method: 'POST',
    body: JSON.stringify(flags),
  })
}

export function getLessonProgress(lesson?: CourseLesson | null): LessonProgress | null {
  if (!lesson?.progress) return null
  if (Array.isArray(lesson.progress)) return lesson.progress[0] || null
  return lesson.progress
}

export function getLessonVideoUrl(lesson?: CourseLesson | null): string {
  if (!lesson || typeof lesson !== 'object') return ''
  const raw = lesson as CourseLesson & Record<string, unknown>
  return String(
    raw.videoUrl ||
      raw.video_url ||
      raw.video ||
      raw.videoURL ||
      raw.fileUrl ||
      raw.mediaUrl ||
      raw.url ||
      '',
  ).trim()
}

export function normalizeLessonMaterials(materials: unknown): LessonMaterial[] {
  if (!Array.isArray(materials)) return []
  return materials
    .map((item) => {
      const row = (item || {}) as Record<string, unknown>
      return {
        name: String(row.name || row.title || '').trim(),
        url: String(row.url || '').trim(),
      }
    })
    .filter((item) => item.name && item.url)
}

export function isManagedVideoUrl(videoUrl = '') {
  const value = String(videoUrl || '')
  if (!value) return false
  if (/res\.cloudinary\.com\/.+\/video\//i.test(value)) return true
  if (/\.b-cdn\.net\//i.test(value) && (/playlist\.m3u8/i.test(value) || /play_\d+p\.mp4/i.test(value))) {
    return true
  }
  return false
}

export async function syncLessonTranscription(lessonId: string) {
  return apiFetch<{
    transcription?: unknown[]
    status?: string
    message?: string
  }>(`/courses/lessons/${lessonId}/sync-transcription`, { method: 'POST' })
}

export type BunnyVideoChapter = {
  title: string
  start: number
  end: number
}

export type BunnyVideoPlayMetadata = {
  provider?: string
  videoId?: string
  libraryId?: string
  length?: number
  thumbnailUrl?: string
  chapters?: BunnyVideoChapter[]
}

export async function getLessonVideoMetadata(lessonId: string) {
  return apiFetch<{
    available?: boolean
    metadata?: BunnyVideoPlayMetadata | null
  }>(`/courses/lessons/${lessonId}/video-metadata`)
}

export async function generateLessonSummary(lessonId: string) {
  return apiFetch<{
    content?: string
    transcriptionLines?: number
  }>(`/courses/lessons/${lessonId}/generate-summary`, { method: 'POST' })
}

export async function listLessonComments(lessonId: string) {
  return apiFetch<LessonComment[]>(`/courses/lessons/${lessonId}/comments`)
}

export async function createLessonComment(lessonId: string, content: string) {
  return apiFetch<LessonComment>(`/courses/lessons/${lessonId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export async function updateLessonComment(commentId: string, content: string) {
  return apiFetch<LessonComment>(`/courses/comments/${commentId}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  })
}

export async function deleteLessonComment(commentId: string) {
  return apiFetch<void>(`/courses/comments/${commentId}`, { method: 'DELETE' })
}

export async function toggleLessonCommentLike(commentId: string) {
  return apiFetch<LessonComment>(`/courses/comments/${commentId}/toggle-like`, {
    method: 'POST',
  })
}

export async function listEbooks() {
  return apiFetch<Ebook[]>('/ebooks')
}

export async function createEbook(payload: {
  title: string
  description?: string | null
  fileUrl: string
  thumbnail?: string | null
}) {
  return apiFetch<Ebook>('/ebooks', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateEbook(
  id: string,
  payload: {
    title: string
    description?: string | null
    fileUrl: string
    thumbnail?: string | null
  },
) {
  return apiFetch<Ebook>(`/ebooks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteEbook(id: string) {
  return apiFetch<void>(`/ebooks/${id}`, { method: 'DELETE' })
}

export async function uploadImage(file: File) {
  return apiUpload<{ url: string }>('/upload', file)
}

export async function uploadDocument(file: File) {
  return apiUpload<{ url: string }>('/upload/file', file)
}

/** Upload de vídeo de aula (Bunny/Cloudinary via backend). Pode demorar em arquivos grandes. */
export async function uploadLessonVideo(file: File) {
  return apiUpload<{
    url: string
    provider?: string
    videoId?: string
    transcriptionStatus?: string
  }>('/upload/video', file)
}
