import { patientAssets } from '@/lib/patient-assets';
import { resolveTileCoverUrl } from '@/lib/media-url';

export type ContentTile = {
  id: string;
  kind: 'course' | 'ebook';
  topic: string;
  tone: string;
  label: string;
  value: string;
  meta: string;
  cover: string;
  raw: Record<string, unknown>;
};

const TOPIC_TONES: Record<string, string> = {
  nutrition: 'pink',
  recipes: 'orange',
  training: 'green',
  mindset: 'purple',
  other: 'blue',
};

export function inferCourseTopic(text: string) {
  const haystack = text.toLowerCase();
  if (/(culin|cozinh|receita|gastron)/.test(haystack)) return 'recipes';
  if (/(treino|fitness|academia|muscul|exerc)/.test(haystack)) return 'training';
  if (/(mindset|mental|emocional|foco|ansiedade)/.test(haystack)) return 'mindset';
  if (/(nutri|alimenta|dieta|metabol|saúde|saude)/.test(haystack)) return 'nutrition';
  return 'other';
}

function getCourseCover(course: Record<string, unknown>, variant: 'desktop' | 'mobile' = 'desktop') {
  if (variant === 'mobile') {
    return String(course.thumbnailMobile || course.thumbnail || '');
  }
  return String(course.thumbnail || '');
}

export function mapCourseToTile(course: Record<string, unknown>): ContentTile {
  const modules = Array.isArray(course.modules) ? course.modules.length : 0;
  const lessons = Array.isArray(course.modules)
    ? course.modules.reduce((sum: number, mod: { lessons?: unknown[] }) => sum + (mod.lessons?.length || 0), 0)
    : 0;
  const metaParts = [`${modules} módulo${modules === 1 ? '' : 's'}`];
  if (lessons) metaParts.push(`${lessons} aula${lessons === 1 ? '' : 's'}`);
  const topic = inferCourseTopic(`${course.title || ''} ${course.description || ''}`);
  const coverPath = getCourseCover(course) || (patientAssets.courseCover as unknown as string);

  return {
    id: String(course.id),
    kind: 'course',
    topic,
    tone: TOPIC_TONES[topic] || TOPIC_TONES.other,
    label: 'Vídeo',
    value: String(course.title || ''),
    meta: metaParts.join(' · '),
    cover: resolveTileCoverUrl(coverPath),
    raw: course,
  };
}

export function mapEbookToTile(ebook: Record<string, unknown>): ContentTile {
  const topic = inferCourseTopic(`${ebook.title || ''} ${ebook.description || ''}`);
  return {
    id: String(ebook.id),
    kind: 'ebook',
    topic,
    tone: TOPIC_TONES[topic] || TOPIC_TONES.other,
    label: 'E-book',
    value: String(ebook.title || ''),
    meta: ebook.description ? 'Material para leitura' : 'Leitura',
    cover: resolveTileCoverUrl(String(ebook.thumbnail || '')),
    raw: ebook,
  };
}
