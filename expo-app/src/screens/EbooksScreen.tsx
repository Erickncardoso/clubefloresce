import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen } from 'lucide-react-native';
import CfTileCarousel from '@/components/shared/CfTileCarousel';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { usePatientApi } from '@/hooks/usePatientApi';
import { mapEbookToTile, type ContentTile } from '@/lib/course-tile';
import { buildDocumentRouteParams } from '@/lib/patient-document';
import { colors, fonts, spacing } from '@/theme/tokens';

export default function EbooksScreen() {
  const router = useRouter();
  const { request } = usePatientApi();
  const [loading, setLoading] = useState(true);
  const [ebooks, setEbooks] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await request<Record<string, unknown>[]>('/ebooks');
        setEbooks(Array.isArray(data) ? data : []);
      } catch (err) {
        setError((err as Error).message || 'Não foi possível carregar os ebooks.');
      } finally {
        setLoading(false);
      }
    })();
  }, [request]);

  const tiles = useMemo(() => ebooks.map(mapEbookToTile), [ebooks]);

  function openEbook(item: ContentTile) {
    const ebook = item.raw;
    const params = buildDocumentRouteParams(String(ebook.fileUrl || ''), {
      title: String(ebook.title || 'Ebook'),
      from: '/ebooks',
    });
    if (!params) {
      Alert.alert('Indisponível', 'Este material ainda não possui arquivo para leitura.');
      return;
    }
    router.push({ pathname: '/documento', params } as never);
  }

  return (
    <PatientShell>
      <PatientHeader title="E-books" showBack backTo="/conteudo" showBell={false} />

      {loading ? (
        <LoadingScreen />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Biblioteca Digital</Text>
            <Text style={styles.heroDesc}>Guias, receitas e materiais exclusivos para leitura.</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {!tiles.length && !error ? (
            <View style={styles.empty}>
              <BookOpen color={colors.textMuted} size={28} />
              <Text style={styles.emptyTitle}>Biblioteca vazia</Text>
              <Text style={styles.emptyText}>Ainda não há materiais disponíveis para leitura.</Text>
            </View>
          ) : (
            <CfTileCarousel items={tiles} onSelect={openEbook} />
          )}
        </ScrollView>
      )}
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[8] },
  hero: { gap: 6, marginBottom: spacing[2] },
  heroTitle: { fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.5 },
  heroDesc: { fontFamily: fonts.regular, color: colors.textMuted, lineHeight: 20 },
  error: { color: colors.error, fontFamily: fonts.medium },
  empty: { alignItems: 'center', gap: spacing[3], paddingVertical: spacing[8] },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 18 },
  emptyText: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
});
