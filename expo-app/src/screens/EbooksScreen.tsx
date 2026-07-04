import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BookOpen } from 'lucide-react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { resolveMediaUrl } from '@/lib/media-url';
import { usePatientApi } from '@/hooks/usePatientApi';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Ebook = {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  fileUrl?: string;
};

export default function EbooksScreen() {
  const { request } = usePatientApi();
  const [loading, setLoading] = useState(true);
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await request<Ebook[]>('/ebooks');
        setEbooks(Array.isArray(data) ? data : []);
      } catch (err) {
        setError((err as Error).message || 'Não foi possível carregar os ebooks.');
      } finally {
        setLoading(false);
      }
    })();
  }, [request]);

  function openEbook(ebook: Ebook) {
    const url = resolveMediaUrl(ebook.fileUrl || '');
    if (!url) {
      Alert.alert('Indisponível', 'Este material ainda não possui arquivo para leitura.');
      return;
    }
    router.push({ pathname: '/ebook-viewer', params: { url, title: ebook.title } });
  }

  return (
    <PatientShell>
      <PatientHeader title="E-books" showBack backTo="/conteudo" showBell={false} showMenu={false} />

      {loading ? (
        <LoadingScreen />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Biblioteca Digital</Text>
            <Text style={styles.heroDesc}>Guias, receitas e materiais exclusivos para leitura.</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {!ebooks.length && !error ? (
            <View style={styles.empty}>
              <BookOpen color={colors.textMuted} size={28} />
              <Text style={styles.emptyTitle}>Biblioteca vazia</Text>
              <Text style={styles.emptyText}>Ainda não há materiais disponíveis para leitura.</Text>
            </View>
          ) : null}

          {ebooks.map((ebook) => {
            const cover = resolveMediaUrl(ebook.thumbnail || '');
            return (
              <Pressable
                key={ebook.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => openEbook(ebook)}
              >
                <View style={styles.coverWrap}>
                  {cover ? (
                    <Image source={{ uri: cover }} style={styles.cover} resizeMode="cover" />
                  ) : (
                    <View style={styles.coverPlaceholder}>
                      <BookOpen color={colors.primaryDark} size={28} />
                    </View>
                  )}
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{ebook.title}</Text>
                  <Text style={styles.cardDesc} numberOfLines={3}>
                    {ebook.description || 'Material complementar exclusivo.'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[8] },
  hero: { gap: 6, marginBottom: spacing[2] },
  heroTitle: { fontFamily: fonts.extrabold, fontSize: 22 },
  heroDesc: { fontFamily: fonts.regular, color: colors.textMuted, lineHeight: 20 },
  error: { color: colors.error, fontFamily: fonts.medium },
  empty: { alignItems: 'center', gap: spacing[3], paddingVertical: spacing[8] },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 18 },
  emptyText: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    minHeight: 140,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.75 },
  coverWrap: { width: 108, alignSelf: 'stretch', backgroundColor: colors.primarySoft },
  cover: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, padding: spacing[3], gap: spacing[2] },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16 },
  cardDesc: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
});
