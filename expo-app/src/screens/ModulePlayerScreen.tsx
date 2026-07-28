import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import LessonVideoPlayer from '@/components/courses/LessonVideoPlayer';

import {

  LessonMobileBar,

  LessonPlayerHeader,

  LessonTabsPanel,

  type LessonItem,

  type LessonTabId,

  type ModulePlayerData,

} from '@/components/courses/lesson-player/LessonPlayerSections';

import PlayerNavigationDrawer from '@/components/courses/lesson-player/PlayerNavigationDrawer';

import PatientShell from '@/components/PatientShell';

import LoadingScreen from '@/components/ui/LoadingScreen';

import { useAppToast } from '@/hooks/useAppToast';

import { buildModuleUrl, findLessonBySlug, getLessonSlug } from '@/lib/course-slug';

import { getLessonVideoUrl } from '@/lib/course-video';

import { toastSuccess } from '@/lib/app-toast';

import { usePatientApi } from '@/hooks/usePatientApi';

import { colors, fonts, radii, spacing } from '@/theme/tokens';



function readParam(value?: string | string[]): string {

  if (Array.isArray(value)) return String(value[0] || '');

  return String(value || '');

}



export default function ModulePlayerScreen() {

  const router = useRouter();

  const params = useLocalSearchParams<{ id?: string; curso?: string; aula?: string; lessonId?: string }>();

  const { request } = usePatientApi();

  const { showToast } = useAppToast();



  const [loading, setLoading] = useState(true);

  const [moduleData, setModuleData] = useState<ModulePlayerData | null>(null);

  const [activeLesson, setActiveLesson] = useState<LessonItem | null>(null);

  const [error, setError] = useState('');

  const [menuOpen, setMenuOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<LessonTabId>('resumo');

  const [videoCurrentTime, setVideoCurrentTime] = useState(0);

  const seekVideoRef = useRef<((seconds: number) => void) | null>(null);

  const handleVideoTimeUpdate = useCallback((seconds: number) => {
    setVideoCurrentTime(Number(seconds) || 0);
  }, []);



  const moduleId = decodeURIComponent(readParam(params.id));

  const courseId = readParam(params.curso) || undefined;

  const aulaParam = readParam(params.aula);

  const lessonIdParam = readParam(params.lessonId);



  const applyLesson = useCallback((data: ModulePlayerData) => {

    const lessons = data.lessons || [];

    if (!lessons.length) {

      setActiveLesson(null);

      return;

    }



    const queryAula = aulaParam ? decodeURIComponent(aulaParam) : '';

    let target: LessonItem | null = null;

    if (queryAula) target = findLessonBySlug(lessons, queryAula) as LessonItem | null;

    else if (lessonIdParam) target = lessons.find((l) => l.id === lessonIdParam) || null;

    setActiveLesson(target || lessons[0]);

    setVideoCurrentTime(0);

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

        const data = await request<ModulePlayerData>(

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



  const nextModule = useMemo(() => {

    if (!moduleData?.course?.modules) return null;

    const idx = moduleData.course.modules.findIndex((m) => m.id === moduleData.id);

    return idx >= 0 && idx < moduleData.course.modules.length - 1

      ? moduleData.course.modules[idx + 1]

      : null;

  }, [moduleData]);



  function getLessonProgress(lessonId: string) {

    const lesson = moduleData?.lessons?.find((l) => l.id === lessonId);

    return lesson?.progress?.[0] || null;

  }



  function isLessonWatched(lessonId: string) {

    return Boolean(getLessonProgress(lessonId)?.watched);

  }



  async function toggleProgress(lessonId: string, field: 'watched' | 'favorited') {

    const lesson = moduleData?.lessons?.find((l) => l.id === lessonId);

    if (!lesson) return;



    const current = lesson.progress?.[0] || {};

    const newValue = !current[field];

    const payload: Record<string, boolean> = { [field]: newValue };



    try {

      const res = await request<Record<string, unknown>>(`/courses/lessons/${lessonId}/progress`, {

        method: 'POST',

        body: JSON.stringify(payload),

      });



      const patchProgress = (items?: LessonItem[]) => (

        items?.map((item) => (

          item.id === lessonId

            ? { ...item, progress: [res as LessonItem['progress'] extends Array<infer T> ? T : never] }

            : item

        ))

      );



      setModuleData((data) => (

        data ? { ...data, lessons: patchProgress(data.lessons) } : data

      ));

      setActiveLesson((currentLesson) => (

        currentLesson?.id === lessonId

          ? { ...currentLesson, progress: [res as NonNullable<LessonItem['progress']>[0]] }

          : currentLesson

      ));



      if (field === 'watched' && newValue) {

        showToast(toastSuccess('Aula concluída!'));

      }

    } catch {

      /* ignore */

    }

  }



  function selectLesson(lesson: LessonItem) {

    if (!moduleData?.lessons?.length) return;

    setActiveLesson(lesson);

    setActiveTab((tab) => (tab === 'aulas' ? 'resumo' : tab));

    router.setParams({

      aula: getLessonSlug(lesson, moduleData.lessons),

      lessonId: undefined,

    } as never);

  }



  function goNextModule() {

    if (!nextModule || !moduleData?.course?.id) return;

    router.replace(buildModuleUrl(nextModule, undefined, undefined, moduleData.course.id) as never);

  }



  if (loading) {

    return (

      <PatientShell withTabClearance={false}>

        <LoadingScreen />

      </PatientShell>

    );

  }



  if (!moduleData || error) {

    return (

      <PatientShell withTabClearance={false}>

        <View style={styles.center}>

          <Text style={styles.error}>{error || 'Módulo não encontrado.'}</Text>

          <Pressable style={styles.retryBtn} onPress={() => router.back()}>

            <Text style={styles.retryText}>Voltar aos vídeos</Text>

          </Pressable>

        </View>

      </PatientShell>

    );

  }



  const courseTitle = moduleData.course?.title || moduleData.title;

  const progress = activeLesson ? getLessonProgress(activeLesson.id) : null;



  return (

    <PatientShell withTabClearance={false}>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <LessonMobileBar

          courseTitle={courseTitle}

          courseThumbnail={moduleData.course?.thumbnail}

          onOpenMenu={() => setMenuOpen(true)}

        />



        <View style={styles.playerWrap}>
          <LessonVideoPlayer
            key={activeLesson?.id || 'no-lesson'}
            lesson={activeLesson as Record<string, unknown>}
            rawVideoUrl={activeVideoUrl}
            fillContainer
            onTimeUpdate={handleVideoTimeUpdate}
            seekRef={seekVideoRef}
          />
        </View>



        {activeLesson ? (

          <>

            <LessonPlayerHeader

              lesson={activeLesson}

              lessonIndex={lessonIndex}

              watched={Boolean(progress?.watched)}

              favorited={Boolean(progress?.favorited)}

              onToggleWatched={() => void toggleProgress(activeLesson.id, 'watched')}

              onToggleFavorite={() => void toggleProgress(activeLesson.id, 'favorited')}

            />



            <LessonTabsPanel

              activeTab={activeTab}

              onChange={setActiveTab}

              moduleData={moduleData}

              activeLesson={activeLesson}

              currentTime={videoCurrentTime}

              onSeek={(seconds) => seekVideoRef.current?.(seconds)}

              onSelectLesson={selectLesson}

              isLessonWatched={isLessonWatched}

              courseThumbnail={moduleData.course?.thumbnail}

              onNextModule={nextModule ? goNextModule : undefined}

              nextModuleTitle={nextModule?.title}

            />

          </>

        ) : null}

      </ScrollView>



      <PlayerNavigationDrawer

        open={menuOpen}

        onClose={() => setMenuOpen(false)}

        courseTitle={moduleData.course?.title}

        moduleTitle={moduleData.title}

        courseThumbnail={moduleData.course?.thumbnail}

      />

    </PatientShell>

  );

}



const styles = StyleSheet.create({

  scroll: { paddingBottom: spacing[8], backgroundColor: colors.surface },

  playerWrap: {

    marginHorizontal: spacing[4],

    marginBottom: spacing[2],

    borderRadius: 20,

    overflow: 'hidden',

    backgroundColor: '#0c0e12',

    aspectRatio: 16 / 9,

  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[5], gap: spacing[3] },

  error: { color: colors.error, fontFamily: fonts.medium, textAlign: 'center' },

  retryBtn: {

    backgroundColor: colors.primary,

    paddingHorizontal: spacing[4],

    paddingVertical: spacing[3],

    borderRadius: radii.pill,

  },

  retryText: { fontFamily: fonts.bold, color: '#fff' },

});

