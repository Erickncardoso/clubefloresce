import { useEffect, useMemo, useState } from 'react';

import {

  Image,

  Pressable,

  ScrollView,

  StyleSheet,

  Text,

  View,

} from 'react-native';

import { useRouter } from 'expo-router';

import { BookOpen, Play } from 'lucide-react-native';

import BibliotecaScrollRow from '@/components/biblioteca/BibliotecaScrollRow';

import PatientHeader from '@/components/ui/PatientHeader';

import PatientShell from '@/components/PatientShell';

import LoadingScreen from '@/components/ui/LoadingScreen';

import { usePatientApi } from '@/hooks/usePatientApi';

import { mapCourseToTile, type ContentTile } from '@/lib/course-tile';

import { openPatientCourse } from '@/lib/open-patient-course';

import { patientAssets } from '@/lib/patient-assets';

import { resolveMediaUrl } from '@/lib/media-url';

import { colors, fonts, radii, spacing } from '@/theme/tokens';



export default function CursosListScreen() {

  const router = useRouter();

  const { request } = usePatientApi();

  const [loading, setLoading] = useState(true);

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);

  const [error, setError] = useState('');



  useEffect(() => {

    (async () => {

      try {

        const data = await request<Record<string, unknown>[]>('/courses');

        setCourses(Array.isArray(data) ? data : []);

      } catch (err) {

        setError((err as Error).message);

      } finally {

        setLoading(false);

      }

    })();

  }, [request]);



  const tiles = useMemo(() => courses.map(mapCourseToTile), [courses]);



  const featured = useMemo(() => {

    const first = tiles[0];

    if (!first) return null;

    const course = first.raw;

    return {

      title: String(course.bannerTitle || first.value),

      subtitle: String(course.bannerSubtitle || course.description || first.meta),

      cover: resolveMediaUrl(String(course.bannerImage || course.thumbnail || '')),

      badge: String(course.bannerKicker || 'Destaque da semana'),

      item: first,

    };

  }, [tiles]);



  function openTile(item: ContentTile) {

    if (openPatientCourse(item.raw, (url) => router.push(url as never))) return;

    router.push(`/cursos/${item.id}` as never);

  }



  return (

    <PatientShell>

      <PatientHeader title="Vídeos" showBack backTo="/conteudo" showBell={false} showMenu={false} />

      {loading ? (

        <LoadingScreen />

      ) : (

        <ScrollView contentContainerStyle={styles.scroll}>

          {error ? <Text style={styles.error}>{error}</Text> : null}



          {featured ? (

            <Pressable style={styles.banner} onPress={() => openTile(featured.item)}>

              <Image

                source={featured.cover ? { uri: featured.cover } : patientAssets.courseCover}

                style={styles.bannerImage}

                resizeMode="cover"

              />

              <View style={styles.bannerOverlay} />

              <View style={styles.bannerBody}>

                <Text style={styles.bannerKicker}>{featured.badge}</Text>

                <Text style={styles.bannerTitle}>{featured.title}</Text>

                <Text style={styles.bannerSubtitle} numberOfLines={2}>{featured.subtitle}</Text>

                <View style={styles.bannerCta}>

                  <Play color="#fff" size={16} fill="#fff" />

                  <Text style={styles.bannerCtaText}>Assistir agora</Text>

                </View>

              </View>

            </Pressable>

          ) : null}



          {!tiles.length ? (

            <View style={styles.emptyWrap}>

              <BookOpen color={colors.textMuted} size={28} />

              <Text style={styles.emptyTitle}>Nenhum vídeo disponível</Text>

              <Text style={styles.emptyText}>Ainda não há cursos disponíveis para você.</Text>

            </View>

          ) : (

            <BibliotecaScrollRow

              title="Todos os vídeos"

              items={tiles}

              onSelect={openTile}

            />

          )}

        </ScrollView>

      )}

    </PatientShell>

  );

}



const styles = StyleSheet.create({

  scroll: { padding: spacing[4], paddingBottom: spacing[8], gap: spacing[4] },

  error: { color: colors.error, fontFamily: fonts.medium },

  banner: {

    minHeight: 220,

    borderRadius: radii.surface,

    overflow: 'hidden',

    backgroundColor: '#111827',

  },

  bannerImage: { ...StyleSheet.absoluteFillObject, opacity: 0.42 },

  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,9,14,0.55)' },

  bannerBody: { padding: spacing[5], justifyContent: 'flex-end', minHeight: 220, gap: spacing[2] },

  bannerKicker: {

    alignSelf: 'flex-start',

    fontFamily: fonts.semibold,

    fontSize: 11,

    color: 'rgba(255,255,255,0.82)',

    textTransform: 'uppercase',

    letterSpacing: 0.6,

  },

  bannerTitle: { color: '#fff', fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 28 },

  bannerSubtitle: { color: 'rgba(255,255,255,0.82)', fontFamily: fonts.regular, lineHeight: 20 },

  bannerCta: {

    marginTop: spacing[2],

    alignSelf: 'flex-start',

    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,

    backgroundColor: colors.primary,

    paddingHorizontal: spacing[4],

    paddingVertical: spacing[3],

    borderRadius: radii.pill,

  },

  bannerCtaText: { color: '#fff', fontFamily: fonts.bold, fontSize: 14 },

  emptyWrap: { alignItems: 'center', gap: spacing[2], paddingVertical: spacing[8] },

  emptyTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },

  emptyText: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },

});

