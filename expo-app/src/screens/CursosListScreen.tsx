import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Video } from 'lucide-react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { usePatientApi } from '@/hooks/usePatientApi';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Course = {
  id: string;
  title: string;
  description?: string;
  modulesCount?: number;
};

export default function CursosListScreen() {
  const router = useRouter();
  const { request } = usePatientApi();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await request<Course[]>('/courses');
        setCourses(Array.isArray(data) ? data : []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [request]);

  return (
    <PatientShell>
      <PatientHeader title="Vídeos" showBack backTo="/conteudo" showBell={false} showMenu={false} />
      {loading ? (
        <LoadingScreen />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!courses.length ? (
            <Text style={styles.empty}>Nenhum curso disponível no momento.</Text>
          ) : null}
          {courses.map((course) => (
            <Pressable
              key={course.id}
              style={styles.card}
              onPress={() => router.push(`/cursos/${course.id}` as never)}
            >
              <View style={styles.iconWrap}>
                <Video color={colors.primaryDark} size={22} />
              </View>
              <View style={styles.body}>
                <Text style={styles.title}>{course.title}</Text>
                {course.description ? (
                  <Text style={styles.desc} numberOfLines={2}>{course.description}</Text>
                ) : null}
              </View>
              <Play color={colors.primary} size={20} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[6] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 4 },
  title: { fontFamily: fonts.bold, fontSize: 16 },
  desc: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 13 },
  empty: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.error, fontFamily: fonts.medium },
});
