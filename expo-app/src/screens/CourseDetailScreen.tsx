import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, LayoutGrid, Library, Play, Star } from 'lucide-react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { buildModuleUrl } from '@/lib/course-slug';
import { resolveMediaUrl } from '@/lib/media-url';
import { usePatientApi } from '@/hooks/usePatientApi';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Lesson = {
  id: string;
  title: string;
  duration?: string;
  content?: string;
  thumbnail?: string;
  completed?: boolean;
  isCompleted?: boolean;
  progress?: number;
};

type Module = {
  id: string;
  title: string;
  lessons?: Lesson[];
};

type Course = {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  rating?: number;
  reviewsCount?: number;
  modules?: Module[];
};

type TabId = 'overview' | 'contents';

function isLessonCompleted(lesson: Lesson) {
  return Boolean(
    lesson.completed
    || lesson.isCompleted
    || lesson.progress === 100,
  );
}

export default function CourseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { request } = usePatientApi();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [error, setError] = useState('');

  const courseId = String(id || '');

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      try {
        const data = await request<Course>(`/courses/${courseId}`);
        setCourse(data);
        const firstModuleId = data.modules?.[0]?.id;
        if (firstModuleId) setExpanded({ [firstModuleId]: true });
      } catch (err) {
        setError((err as Error).message || 'Não foi possível carregar o curso.');
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, request]);

  const cover = useMemo(
    () => resolveMediaUrl(course?.thumbnail || ''),
    [course?.thumbnail],
  );

  const modules = course?.modules || [];
  const totalLessons = useMemo(
    () => modules.reduce((sum, mod) => sum + (mod.lessons?.length || 0), 0),
    [modules],
  );

  const completedLessons = useMemo(
    () => modules.reduce(
      (sum, mod) => sum + (mod.lessons || []).filter(isLessonCompleted).length,
      0,
    ),
    [modules],
  );

  const progressPct = totalLessons
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  const ratingValue = Number(course?.rating || 4.9);
  const ratingLabel = ratingValue.toFixed(2).replace('.', ',');
  const reviewsCount = Number(course?.reviewsCount || 0);

  const courseTags = useMemo(() => ([
    'Formação',
    'Prático',
    `${modules.length} módulos`,
    `${totalLessons} aulas`,
  ]), [modules.length, totalLessons]);

  const overviewParagraphs = useMemo(() => {
    const raw = String(course?.description || '').trim();
    if (!raw) {
      return [
        'Nesta trilha, você percorre os conceitos essenciais dos vídeos de forma prática, com foco em execução e entendimento progressivo.',
        'Ao avançar pelos módulos, você consolida fundamentos e aplica os aprendizados em cenários reais.',
      ];
    }
    const parts = raw.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean);
    if (parts.length === 1) {
      return [parts[0], 'Continue pelas aulas para aprofundar os conceitos na prática.'];
    }
    return [
      parts.slice(0, Math.ceil(parts.length / 2)).join(' '),
      parts.slice(Math.ceil(parts.length / 2)).join(' '),
    ];
  }, [course?.description]);

  function openLesson(module: Module, lesson: Lesson) {
    router.push(buildModuleUrl(module, lesson, module.lessons, course?.id) as never);
  }

  function openFirstLesson() {
    const firstModule = modules[0];
    const firstLesson = firstModule?.lessons?.[0];
    if (firstModule && firstLesson) openLesson(firstModule, firstLesson);
  }

  if (loading) {
    return (
      <PatientShell>
        <PatientHeader title="Curso" showBack backTo="/cursos" showBell={false} showMenu={false} />
        <LoadingScreen />
      </PatientShell>
    );
  }

  if (!course) {
    return (
      <PatientShell>
        <PatientHeader title="Curso" showBack backTo="/cursos" showBell={false} showMenu={false} />
        <View style={styles.center}>
          <Text style={styles.error}>{error || 'Curso não encontrado.'}</Text>
        </View>
      </PatientShell>
    );
  }

  return (
    <PatientShell>
      <PatientHeader title={course.title} showBack backTo="/cursos" showBell={false} showMenu={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.heroCover} resizeMode="cover" />
          ) : null}
          <View style={styles.heroOverlay} />
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>{course.title}</Text>
            {course.description ? (
              <Text style={styles.heroDesc} numberOfLines={3}>{course.description}</Text>
            ) : null}
            <View style={styles.chipRow}>
              {courseTags.map((chip) => (
                <Text key={chip} style={styles.chip}>{chip}</Text>
              ))}
            </View>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingStrong}>{ratingLabel}</Text>
              <View style={styles.stars}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={`star-${index}`}
                    size={14}
                    color="#f5b301"
                    fill={index < Math.round(ratingValue) ? '#f5b301' : 'transparent'}
                  />
                ))}
              </View>
              {reviewsCount ? (
                <Text style={styles.ratingMeta}>({reviewsCount.toLocaleString('pt-BR')})</Text>
              ) : null}
              <Text style={styles.ratingMeta}>{totalLessons} aulas · {modules.length} módulos</Text>
            </View>
            {totalLessons > 0 ? (
              <Pressable style={styles.playBtn} onPress={openFirstLesson}>
                <Play color="#fff" size={18} fill="#fff" />
                <Text style={styles.playBtnText}>Começar agora</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tabBtn, activeTab === 'overview' && styles.tabBtnActive]}
            onPress={() => setActiveTab('overview')}
          >
            <LayoutGrid size={14} color={activeTab === 'overview' ? colors.text : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Visão geral</Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, activeTab === 'contents' && styles.tabBtnActive]}
            onPress={() => setActiveTab('contents')}
          >
            <Library size={14} color={activeTab === 'contents' ? colors.text : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'contents' && styles.tabTextActive]}>Conteúdos</Text>
          </Pressable>
        </View>

        {activeTab === 'overview' ? (
          <View style={styles.overviewCard}>
            {cover ? (
              <View style={styles.overviewMedia}>
                <Image source={{ uri: cover }} style={styles.overviewCover} resizeMode="cover" />
                <View style={styles.overviewOverlay} />
                <Text style={styles.overviewMediaTitle}>Conheça a formação</Text>
              </View>
            ) : null}
            <View style={styles.overviewBody}>
              <Text style={styles.overviewText}>{overviewParagraphs[0]}</Text>
              <Text style={styles.overviewText}>{overviewParagraphs[1]}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.progressCard}>
          <View style={styles.progressHead}>
            <Text style={styles.progressTitle}>Progresso geral</Text>
            <Text style={styles.progressPct}>{progressPct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.progressMeta}>
            {completedLessons} de {totalLessons} aulas concluídas
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Módulos e aulas</Text>

        {modules.map((module, moduleIndex) => {
          const isOpen = expanded[module.id];
          return (
            <View key={module.id} style={styles.moduleCard}>
              <Pressable
                style={styles.moduleHead}
                onPress={() => setExpanded((e) => ({ ...e, [module.id]: !e[module.id] }))}
              >
                <View style={styles.moduleCopy}>
                  {activeTab === 'contents' ? (
                    <Text style={styles.moduleLevel}>Nível {moduleIndex + 1}</Text>
                  ) : null}
                  <Text style={styles.moduleTitle}>{module.title}</Text>
                  <Text style={styles.moduleMeta}>{module.lessons?.length || 0} aulas neste módulo</Text>
                </View>
                <ChevronDown
                  color={colors.textMuted}
                  size={20}
                  style={isOpen ? styles.chevOpen : undefined}
                />
              </Pressable>
              {isOpen ? (
                <View style={styles.lessonList}>
                  {(module.lessons || []).map((lesson, index) => {
                    const completed = isLessonCompleted(lesson);
                    const thumb = resolveMediaUrl(lesson.thumbnail || course.thumbnail || '');
                    return (
                      <Pressable
                        key={lesson.id}
                        style={[styles.lessonRow, completed && styles.lessonRowDone]}
                        onPress={() => openLesson(module, lesson)}
                      >
                        <Text style={styles.lessonIndex}>{index + 1}</Text>
                        {thumb ? (
                          <Image source={{ uri: thumb }} style={styles.lessonThumb} resizeMode="cover" />
                        ) : null}
                        <View style={styles.lessonCopy}>
                          <Text style={styles.lessonTitle}>{lesson.title}</Text>
                          <Text style={styles.lessonSub}>
                            {completed ? 'Aula concluída' : 'Aula pendente'}
                            {lesson.duration ? ` · ${lesson.duration}` : ''}
                          </Text>
                        </View>
                        <Play color={colors.primary} size={16} />
                      </Pressable>
                    );
                  })}
                  {!module.lessons?.length ? (
                    <Text style={styles.emptyModule}>Este módulo ainda não possui aulas.</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing[8] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[5] },
  error: { color: colors.error, fontFamily: fonts.medium, textAlign: 'center' },
  hero: {
    minHeight: 260,
    backgroundColor: '#111827',
    overflow: 'hidden',
  },
  heroCover: { ...StyleSheet.absoluteFillObject, opacity: 0.35 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,9,14,0.72)' },
  heroBody: { padding: spacing[5], paddingTop: spacing[6], gap: spacing[2] },
  heroTitle: { color: '#fff', fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 28 },
  heroDesc: { color: 'rgba(255,255,255,0.82)', fontFamily: fonts.regular, lineHeight: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing[1] },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontFamily: fonts.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.78)',
  },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: spacing[1] },
  ratingStrong: { color: '#fff', fontFamily: fonts.bold, fontSize: 14 },
  stars: { flexDirection: 'row', gap: 2 },
  ratingMeta: { color: 'rgba(255,255,255,0.62)', fontFamily: fonts.regular, fontSize: 12 },
  playBtn: {
    marginTop: spacing[3],
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.pill,
  },
  playBtnText: { color: '#fff', fontFamily: fonts.bold },
  tabs: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: spacing[3],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: colors.primary },
  tabText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  tabTextActive: { color: colors.text },
  overviewCard: {
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  overviewMedia: { minHeight: 180, justifyContent: 'flex-end' },
  overviewCover: { ...StyleSheet.absoluteFillObject },
  overviewOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  overviewMediaTitle: {
    padding: spacing[4],
    color: '#fff',
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  overviewBody: { padding: spacing[4], gap: spacing[3] },
  overviewText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.text },
  progressCard: {
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    padding: spacing[4],
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing[2],
  },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { fontFamily: fonts.bold, fontSize: 15 },
  progressPct: { fontFamily: fonts.bold, fontSize: 15, color: colors.primaryDark },
  progressTrack: {
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radii.pill },
  progressMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  sectionTitle: {
    marginHorizontal: spacing[4],
    marginTop: spacing[5],
    marginBottom: spacing[3],
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  moduleCard: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  moduleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[3],
  },
  moduleCopy: { flex: 1 },
  moduleLevel: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  moduleTitle: { fontFamily: fonts.bold, fontSize: 16 },
  moduleMeta: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 12, marginTop: 2 },
  chevOpen: { transform: [{ rotate: '180deg' }] },
  lessonList: { borderTopWidth: 1, borderTopColor: colors.border },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lessonRowDone: { backgroundColor: '#f8fcf9' },
  lessonIndex: {
    width: 24,
    textAlign: 'center',
    fontFamily: fonts.bold,
    color: colors.textMuted,
  },
  lessonThumb: { width: 72, height: 42, borderRadius: 8, backgroundColor: colors.primarySoft },
  lessonCopy: { flex: 1, gap: 2 },
  lessonTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  lessonSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  emptyModule: {
    padding: spacing[4],
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
});
