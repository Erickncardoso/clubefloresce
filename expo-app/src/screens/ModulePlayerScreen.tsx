import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import LessonVideoPlayer from '@/components/courses/LessonVideoPlayer';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { buildModuleUrl, findLessonBySlug, getLessonSlug } from '@/lib/course-slug';
import { getLessonVideoUrl } from '@/lib/course-video';
import { usePatientApi } from '@/hooks/usePatientApi';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Lesson = {
  id: string;
  title: string;
  duration?: string;
  content?: string;
  summary?: string;
  videoUrl?: string;
  progress?: Array<{ watched?: boolean }>;
};

type ModuleData = {
  id: string;
  title: string;
  lessons?: Lesson[];
  course?: {
    id?: string;
    title?: string;
    modules?: Array<{ id: string }>;
  };
};

function readParam(value?: string | string[]): string {
  if (Array.isArray(value)) return String(value[0] || '');
  return String(value || '');
}

export default function ModulePlayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; curso?: string; aula?: string; lessonId?: string }>();
  const { request } = usePatientApi();
  const [loading, setLoading] = useState(true);
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState('');

  const moduleId = decodeURIComponent(readParam(params.id));
  const courseId = readParam(params.curso) || undefined;
  const aulaParam = readParam(params.aula);
  const lessonIdParam = readParam(params.lessonId);

  const applyLesson = useCallback((data: ModuleData) => {
    const lessons = data.lessons || [];
    if (!lessons.length) {
      setActiveLesson(null);
      return;
    }

    const queryAula = aulaParam ? decodeURIComponent(aulaParam) : '';
    let target: Lesson | null = null;
    if (queryAula) target = findLessonBySlug(lessons, queryAula);
    else if (lessonIdParam) target = lessons.find((l) => l.id === lessonIdParam) || null;
    setActiveLesson(target || lessons[0]);
  }, [aulaParam, lessonIdParam]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!moduleId) return;
      setModuleData(null);
      setActiveLesson(null);
      setLoading(true);
      setError('');

      try {
        const query = new URLSearchParams();
        if (courseId) query.set('courseId', courseId);
        if (aulaParam) query.set('aula', aulaParam);
        const qs = query.toString();
        const data = await request<ModuleData>(
          `/courses/modules/${encodeURIComponent(moduleId)}${qs ? `?${qs}` : ''}`,
        );
        if (cancelled) return;
        setModuleData(data);
        applyLesson(data);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || 'Não foi possível carregar este módulo.');
        setModuleData(null);
        setActiveLesson(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyLesson, moduleId, courseId, aulaParam, request]);

  useEffect(() => {
    if (moduleData) applyLesson(moduleData);
  }, [applyLesson, moduleData, aulaParam, lessonIdParam]);

  const activeVideoUrl = useMemo(
    () => getLessonVideoUrl(activeLesson as Record<string, unknown>),
    [activeLesson],
  );

  const lessonIndex = useMemo(() => {
    if (!moduleData?.lessons || !activeLesson) return 0;
    const idx = moduleData.lessons.findIndex((l) => l.id === activeLesson.id);
    return idx >= 0 ? idx : 0;
  }, [activeLesson, moduleData?.lessons]);

  const prevLesson = moduleData?.lessons?.[lessonIndex - 1];
  const nextLesson = moduleData?.lessons?.[lessonIndex + 1];

  async function toggleWatched() {
    if (!activeLesson) return;
    const watched = !activeLesson.progress?.[0]?.watched;
    await request(`/courses/lessons/${activeLesson.id}/progress`, {
      method: 'POST',
      body: JSON.stringify({ watched }),
    });
    setActiveLesson((lesson) => {
      if (!lesson) return lesson;
      return { ...lesson, progress: [{ watched }] };
    });
    setModuleData((data) => {
      if (!data?.lessons) return data;
      return {
        ...data,
        lessons: data.lessons.map((lesson) => (
          lesson.id === activeLesson.id
            ? { ...lesson, progress: [{ watched }] }
            : lesson
        )),
      };
    });
  }

  function selectLesson(lesson: Lesson) {
    if (!moduleData?.lessons?.length) return;
    setActiveLesson(lesson);
    router.setParams({
      aula: getLessonSlug(lesson, moduleData.lessons),
      lessonId: undefined,
    } as never);
  }

  function goLesson(lesson?: Lesson) {
    if (!lesson) return;
    selectLesson(lesson);
  }

  const headerTitle = moduleData?.course?.title || moduleData?.title || 'Aula';

  if (loading) {
    return (
      <PatientShell withTabClearance={false}>
        <PatientHeader title="Carregando..." showBack showBell={false} showMenu={false} />
        <LoadingScreen />
      </PatientShell>
    );
  }

  if (!moduleData || error) {
    return (
      <PatientShell withTabClearance={false}>
        <PatientHeader title="Aula" showBack showBell={false} showMenu={false} />
        <View style={styles.center}>
          <Text style={styles.error}>{error || 'Módulo não encontrado.'}</Text>
          <Pressable style={styles.retryBtn} onPress={() => {
            setLoading(true);
            setError('');
            request<ModuleData>(
              `/courses/modules/${encodeURIComponent(moduleId)}${courseId ? `?courseId=${courseId}` : ''}`,
            )
              .then((data) => {
                setModuleData(data);
                applyLesson(data);
              })
              .catch((err: Error) => setError(err.message || 'Não foi possível carregar este módulo.'))
              .finally(() => setLoading(false));
          }}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      </PatientShell>
    );
  }

  return (
    <PatientShell withTabClearance={false}>
      <PatientHeader title={headerTitle} showBack showBell={false} showMenu={false} />
      <View style={styles.page}>
        <LessonVideoPlayer
          key={activeLesson?.id || 'no-lesson'}
          lesson={activeLesson as Record<string, unknown>}
          rawVideoUrl={activeVideoUrl}
        />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {activeLesson ? (
            <View style={styles.lessonHead}>
              <View style={styles.lessonCopy}>
                <Text style={styles.lessonKicker}>Aula {lessonIndex + 1}</Text>
                <Text style={styles.lessonTitle}>{activeLesson.title}</Text>
                {activeLesson.duration ? (
                  <Text style={styles.lessonDuration}>{activeLesson.duration}</Text>
                ) : null}
              </View>
              <Pressable
                style={[styles.doneBtn, activeLesson.progress?.[0]?.watched && styles.doneBtnActive]}
                onPress={toggleWatched}
              >
                <Check color={activeLesson.progress?.[0]?.watched ? '#fff' : colors.primaryDark} size={16} />
                <Text style={[styles.doneBtnText, activeLesson.progress?.[0]?.watched && styles.doneBtnTextActive]}>
                  {activeLesson.progress?.[0]?.watched ? 'Concluída' : 'Marcar concluída'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {activeLesson?.summary || activeLesson?.content ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Resumo</Text>
              <Text style={styles.summaryText}>{activeLesson.summary || activeLesson.content}</Text>
            </View>
          ) : null}

          <View style={styles.navRow}>
            <Pressable
              style={[styles.navBtn, !prevLesson && styles.navBtnDisabled]}
              disabled={!prevLesson}
              onPress={() => goLesson(prevLesson)}
            >
              <ChevronLeft size={16} color={prevLesson ? colors.text : colors.textMuted} />
              <Text style={styles.navBtnText}>Anterior</Text>
            </Pressable>
            <Pressable
              style={[styles.navBtn, !nextLesson && styles.navBtnDisabled]}
              disabled={!nextLesson}
              onPress={() => goLesson(nextLesson)}
            >
              <Text style={styles.navBtnText}>Próxima</Text>
              <ChevronRight size={16} color={nextLesson ? colors.text : colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.listTitle}>Aulas do módulo</Text>
          {(moduleData.lessons || []).map((lesson, index) => {
            const active = activeLesson?.id === lesson.id;
            return (
              <Pressable
                key={lesson.id}
                style={[styles.lessonRow, active && styles.lessonRowActive]}
                onPress={() => selectLesson(lesson)}
              >
                <Text style={styles.lessonRowIndex}>{index + 1}</Text>
                <View style={styles.lessonRowCopy}>
                  <Text style={styles.lessonRowTitle}>{lesson.title}</Text>
                  <Text style={styles.lessonRowMeta}>
                    {lesson.progress?.[0]?.watched ? 'Concluída' : 'Pendente'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing[8] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[5], gap: spacing[3] },
  error: { color: colors.error, fontFamily: fonts.medium, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.pill,
  },
  retryText: { fontFamily: fonts.semibold, color: colors.primaryDark },
  lessonHead: {
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[4],
    alignItems: 'flex-start',
  },
  lessonCopy: { flex: 1, gap: 4 },
  lessonKicker: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primaryDark },
  lessonTitle: { fontFamily: fonts.bold, fontSize: 18 },
  lessonDuration: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 13 },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface,
  },
  doneBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  doneBtnText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primaryDark },
  doneBtnTextActive: { color: '#fff' },
  summaryCard: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    padding: spacing[4],
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[2],
  },
  summaryTitle: { fontFamily: fonts.bold, fontSize: 15 },
  summaryText: { fontFamily: fonts.regular, color: colors.textMuted, lineHeight: 20 },
  navRow: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing[3],
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  navBtnDisabled: { opacity: 0.45 },
  navBtnText: { fontFamily: fonts.semibold, fontSize: 13 },
  listTitle: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    padding: spacing[3],
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  lessonRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  lessonRowIndex: { width: 24, textAlign: 'center', fontFamily: fonts.bold, color: colors.textMuted },
  lessonRowCopy: { flex: 1 },
  lessonRowTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  lessonRowMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
