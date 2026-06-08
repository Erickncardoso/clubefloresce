import { BookOpen, FileText } from 'lucide-vue-next'

const TOPIC_TONES = {
  nutrition: 'pink',
  recipes: 'orange',
  training: 'green',
  mindset: 'purple',
  other: 'blue',
}

export function topicToTone(topic) {
  return TOPIC_TONES[topic] || TOPIC_TONES.other
}

export function inferCourseTopic(text) {
  const haystack = String(text || '').toLowerCase()
  if (/(culin|cozinh|receita|gastron)/.test(haystack)) return 'recipes'
  if (/(treino|fitness|academia|muscul|exerc)/.test(haystack)) return 'training'
  if (/(mindset|mental|emocional|foco|ansiedade)/.test(haystack)) return 'mindset'
  if (/(nutri|alimenta|dieta|metabol|saúde|saude)/.test(haystack)) return 'nutrition'
  return 'other'
}

export function countCourseLessons(course) {
  return (course?.modules || []).reduce((total, module) => total + (module.lessons?.length || 0), 0)
}

export function formatModuleCount(count) {
  const total = Number(count) || 0
  if (total === 1) return '1 módulo'
  return `${total} módulos`
}

export function formatLessonCount(count) {
  const total = Number(count) || 0
  if (total === 1) return '1 aula'
  return `${total} aulas`
}

export function mapCourseToTile(course, { getCover, topic } = {}) {
  const modules = course?.modules?.length || 0
  const lessons = countCourseLessons(course)
  const metaParts = [formatModuleCount(modules)]
  if (lessons) metaParts.push(formatLessonCount(lessons))
  const resolvedTopic = topic || inferCourseTopic(`${course?.title || ''} ${course?.description || ''}`)

  return {
    id: course.id,
    kind: 'course',
    topic: resolvedTopic,
    tone: topicToTone(resolvedTopic),
    label: 'Curso',
    value: course.title,
    meta: metaParts.join(' · '),
    cover: getCover ? getCover(course, 'desktop') : '',
    icon: BookOpen,
    ariaLabel: `Abrir curso ${course.title}`,
    raw: course,
  }
}

export function mapEbookToTile(ebook, { topic } = {}) {
  const resolvedTopic = topic || inferCourseTopic(`${ebook?.title || ''} ${ebook?.description || ''}`)

  return {
    id: ebook.id,
    kind: 'ebook',
    topic: resolvedTopic,
    tone: topicToTone(resolvedTopic),
    label: 'E-book',
    value: ebook.title,
    meta: ebook.description ? 'Material para leitura' : 'Leitura',
    cover: ebook.thumbnail || '',
    icon: FileText,
    ariaLabel: `Abrir ebook ${ebook.title}`,
    raw: ebook,
  }
}
