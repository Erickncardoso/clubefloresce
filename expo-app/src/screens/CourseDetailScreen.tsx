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
import { ChevronDown, Play } from 'lucide-react-native';
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
  progress?: Array<{ watched?: boolean }>;
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
  modules?: Module[];
};

export default function CourseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { request } = usePatientApi();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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

  const totalLessons = useMemo(
    () => (course?.modules || []).reduce((sum, mod) => sum + (mod.lessons?.length || 0), 0),
    [course?.modules],
  );

  function openLesson(module: Module, lesson: Lesson) {
    router.push(buildModuleUrl(module, lesson, module.lessons, course?.id) as never);
  }

  function openFirstLesson() {
    const firstModule = course?.modules?.[0];
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
              <Text style={styles.heroDesc}>{course.description}</Text>
            ) : null}
            <Text style={styles.heroMeta}>
              {(course.modules?.length || 0)} módulos · {totalLessons} aulas
            </Text>
            {totalLessons > 0 ? (
              <Pressable style={styles.playBtn} onPress={openFirstLesson}>
                <Play color="#fff" size={18} fill="#fff" />
                <Text style={styles.playBtnText}>Começar agora</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Módulos e aulas</Text>

        {(course.modules || []).map((module) => {
          const isOpen = expanded[module.id];
          return (
            <View key={module.id} style={styles.moduleCard}>
              <Pressable
                style={styles.moduleHead}
                onPress={() => setExpanded((e) => ({ ...e, [module.id]: !e[module.id] }))}
              >
                <View style={styles.moduleCopy}>
                  <Text style={styles.moduleTitle}>{module.title}</Text>
                  <Text style={styles.moduleMeta}>{module.lessons?.length || 0} aulas</Text>
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
                    const watched = Boolean(lesson.progress?.[0]?.watched);
                    return (
                      <Pressable
                        key={lesson.id}
                        style={styles.lessonRow}
                        onPress={() => openLesson(module, lesson)}
                      >
                        <Text style={styles.lessonIndex}>{index + 1}</Text>
                        <View style={styles.lessonCopy}>
                          <Text style={styles.lessonTitle}>{lesson.title}</Text>
                          <Text style={styles.lessonSub}>
                            {watched ? 'Concluída' : 'Aula pendente'}
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
    minHeight: 220,
    backgroundColor: '#111827',
    overflow: 'hidden',
  },
  heroCover: { ...StyleSheet.absoluteFillObject, opacity: 0.35 },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,9,14,0.72)',
  },
  heroBody: { padding: spacing[5], paddingTop: spacing[6], gap: spacing[2] },
  heroTitle: { color: '#fff', fontFamily: fonts.extrabold, fontSize: 24 },
  heroDesc: { color: 'rgba(255,255,255,0.82)', fontFamily: fonts.regular, lineHeight: 20 },
  heroMeta: { color: 'rgba(255,255,255,0.6)', fontFamily: fonts.medium, fontSize: 13 },
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
  lessonIndex: {
    width: 28,
    textAlign: 'center',
    fontFamily: fonts.bold,
    color: colors.textMuted,
  },
  lessonCopy: { flex: 1, gap: 2 },
  lessonTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  lessonSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  emptyModule: {
    padding: spacing[4],
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
});
