import { buildModuleUrl } from '@/lib/course-slug';

type CourseLike = {
  id?: string;
  modules?: Array<{
    id?: string;
    lessons?: Array<{ id?: string; title?: string | null; order?: number }>;
  }>;
};

/** URL do player de aulas para o app paciente (espelha frontend/utils/open-patient-course.js). */
export function resolvePatientCoursePlayerUrl(course: CourseLike | null | undefined): string | null {
  if (!course?.id) return null;

  const modules = Array.isArray(course.modules) ? course.modules : [];
  const firstModuleWithLesson = modules.find((module) => module?.lessons?.length);
  const firstLesson = firstModuleWithLesson?.lessons?.[0];

  if (firstModuleWithLesson?.id && firstLesson?.id) {
    const lessons = firstModuleWithLesson.lessons || [];
    return buildModuleUrl(
      { id: firstModuleWithLesson.id },
      { id: firstLesson.id, title: firstLesson.title, order: firstLesson.order },
      lessons.map((lesson) => ({
        id: String(lesson.id),
        title: lesson.title,
        order: lesson.order,
      })),
      course.id,
    );
  }

  const firstModule = modules[0];
  if (firstModule?.id) {
    return buildModuleUrl({ id: firstModule.id }, null, undefined, course.id);
  }

  return null;
}

export function openPatientCourse(
  course: CourseLike | null | undefined,
  navigate: (url: string) => void,
): boolean {
  const url = resolvePatientCoursePlayerUrl(course);
  if (!url) return false;
  navigate(url);
  return true;
}
