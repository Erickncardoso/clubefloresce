import { buildModuleUrl } from './course-slug'

/** URL do player de aulas para o app paciente. */
export function resolvePatientCoursePlayerUrl(course) {
  if (!course?.id) return null

  const modules = Array.isArray(course.modules) ? course.modules : []
  const firstModuleWithLesson = modules.find((module) => module?.lessons?.length)
  const firstLesson = firstModuleWithLesson?.lessons?.[0]

  if (firstModuleWithLesson?.id && firstLesson?.id) {
    return buildModuleUrl(
      firstModuleWithLesson,
      firstLesson,
      firstModuleWithLesson.lessons,
      course.id,
    )
  }

  const firstModule = modules[0]
  if (firstModule?.id) {
    return buildModuleUrl(firstModule, null, null, course.id)
  }

  return null
}

export function openPatientCourse(course, navigate) {
  const url = resolvePatientCoursePlayerUrl(course)
  if (!url) return false
  void navigate(url)
  return true
}
