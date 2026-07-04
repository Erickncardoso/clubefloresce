import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Dumbbell,
  Heart,
  Search,
  Sparkles,
  Utensils,
} from 'lucide-react-native';
import BibliotecaScrollRow from '@/components/biblioteca/BibliotecaScrollRow';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { usePatientApi } from '@/hooks/usePatientApi';
import {
  mapCourseToTile,
  mapEbookToTile,
  type ContentTile,
} from '@/lib/course-tile';
import { patientAssets } from '@/lib/patient-assets';
import { resolveMediaUrl } from '@/lib/media-url';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const CHIPS = [
  { id: 'all', label: 'Tudo' },
  { id: 'courses', label: 'Vídeos' },
  { id: 'ebooks', label: 'E-books' },
  { id: 'recipes', label: 'Receitas' },
];

const QUICK_TOPICS = [
  { id: 'nutrition', label: 'Nutrição', Icon: Heart, bg: colors.primarySoft, fg: colors.primaryDark },
  { id: 'recipes', label: 'Receitas', Icon: Utensils, bg: '#faeee6', fg: '#b07a4a' },
  { id: 'training', label: 'Treino', Icon: Dumbbell, bg: '#eef0eb', fg: colors.primaryDark },
  { id: 'mindset', label: 'Mindset', Icon: Brain, bg: '#eeeaf5', fg: '#7c5fad' },
];

export default function ConteudoScreen() {
  const router = useRouter();
  const { request } = usePatientApi();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [ebooks, setEbooks] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [coursesData, ebooksData] = await Promise.all([
          request<Record<string, unknown>[]>('/courses'),
          request<Record<string, unknown>[]>('/ebooks'),
        ]);
        setCourses(Array.isArray(coursesData) ? coursesData : []);
        setEbooks(Array.isArray(ebooksData) ? ebooksData : []);
      } catch (err) {
        setError((err as Error).message || 'Não foi possível carregar a biblioteca.');
      } finally {
        setLoading(false);
      }
    })();
  }, [request]);

  const allCards = useMemo(
    () => [
      ...courses.map(mapCourseToTile),
      ...ebooks.map(mapEbookToTile),
    ],
    [courses, ebooks],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allCards.filter((item) => {
      if (chip === 'courses' && item.kind !== 'course') return false;
      if (chip === 'ebooks' && item.kind !== 'ebook') return false;
      if (chip === 'recipes' && item.topic !== 'recipes') return false;
      if (chip === 'nutrition' && item.topic !== 'nutrition') return false;
      if (chip === 'training' && item.topic !== 'training') return false;
      if (chip === 'mindset' && item.topic !== 'mindset') return false;
      if (!term) return true;
      return `${item.value} ${item.meta}`.toLowerCase().includes(term);
    });
  }, [allCards, chip, search]);

  const courseCards = filtered.filter((item) => item.kind === 'course');
  const ebookCards = filtered.filter((item) => item.kind === 'ebook');

  const featured = useMemo(() => {
    if (chip !== 'all' || search.trim()) return null;
    const firstCourse = courseCards[0];
    if (firstCourse) {
      const course = firstCourse.raw;
      return {
        title: String(course.bannerTitle || firstCourse.value),
        subtitle: String(course.bannerSubtitle || course.description || firstCourse.meta),
        cover: resolveMediaUrl(String(course.bannerImage || course.thumbnail || '')),
        badge: String(course.bannerKicker || 'Destaque da semana'),
        item: firstCourse,
      };
    }
    const firstEbook = ebookCards[0];
    if (!firstEbook) return null;
    return {
      title: firstEbook.value,
      subtitle: firstEbook.meta,
      cover: firstEbook.cover,
      badge: 'E-book',
      item: firstEbook,
    };
  }, [chip, search, courseCards, ebookCards]);

  function openItem(item: ContentTile) {
    if (item.kind === 'course') {
      router.push(`/cursos/${item.id}` as never);
      return;
    }
    router.push('/ebooks' as never);
  }

  return (
    <PatientShell>
      <PatientHeader title="Biblioteca" showBack={false} showBell={false} showMenu={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Aprenda no seu ritmo</Text>
          <Text style={styles.heroTitle}>Conteúdos para florescer</Text>
          <Text style={styles.heroDesc}>Vídeos, guias e materiais escolhidos para apoiar sua rotina.</Text>
        </View>

        <View style={styles.searchWrap}>
          <Search color={colors.textMuted} size={18} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar vídeos ou materiais"
            placeholderTextColor={colors.placeholder}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CHIPS.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.chip, chip === c.id && styles.chipActive]}
              onPress={() => setChip(c.id)}
            >
              <Text style={[styles.chipText, chip === c.id && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? <LoadingScreen /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!loading && featured ? (
          <Pressable style={styles.featured} onPress={() => openItem(featured.item)}>
            <Image
              source={featured.cover ? { uri: featured.cover } : patientAssets.courseCover}
              style={styles.featuredCover}
              resizeMode="cover"
            />
            <View style={styles.featuredBody}>
              <Text style={styles.featuredBadge}>{featured.badge}</Text>
              <Text style={styles.featuredTitle}>{featured.title}</Text>
              <Text style={styles.featuredDesc} numberOfLines={2}>{featured.subtitle}</Text>
              <View style={styles.featuredCta}>
                <Text style={styles.featuredCtaText}>Começar agora</Text>
                <ArrowRight size={16} color={colors.primaryDark} />
              </View>
            </View>
          </Pressable>
        ) : null}

        <View style={styles.quickTopics}>
          {QUICK_TOPICS.map(({ id, label, Icon, bg, fg }) => (
            <Pressable
              key={id}
              style={[styles.quickTopic, chip === id && styles.quickTopicActive]}
              onPress={() => setChip(id)}
            >
              <View style={[styles.quickTopicIcon, { backgroundColor: bg }]}>
                <Icon color={fg} size={18} />
              </View>
              <Text style={styles.quickTopicLabel}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <BibliotecaScrollRow
          title="Vídeos"
          items={courseCards}
          seeAllHref="/cursos"
          onSelect={openItem}
        />
        <BibliotecaScrollRow
          title="Materiais para leitura"
          items={ebookCards}
          seeAllHref="/cursos"
          onSelect={openItem}
        />

        {!loading && !featured && !courseCards.length && !ebookCards.length ? (
          <View style={styles.empty}>
            <BookOpen color={colors.textMuted} size={28} />
            <Text style={styles.emptyTitle}>Nada por aqui ainda</Text>
            <Text style={styles.emptyText}>
              {search.trim()
                ? `Nenhum resultado para “${search.trim()}”.`
                : 'A biblioteca será atualizada em breve com novos conteúdos.'}
            </Text>
            {(search.trim() || chip !== 'all') ? (
              <Pressable style={styles.emptyBtn} onPress={() => { setSearch(''); setChip('all'); }}>
                <Text style={styles.emptyBtnText}>Limpar filtros</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[8] },
  hero: { gap: 4 },
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.primaryDark,
  },
  heroTitle: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.text, letterSpacing: -0.5 },
  heroDesc: { fontFamily: fonts.regular, color: colors.textMuted, lineHeight: 20 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: spacing[3],
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, paddingVertical: spacing[3], fontFamily: fonts.regular },
  chips: { gap: spacing[2] },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  chipTextActive: { color: colors.primaryDark },
  featured: {
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  featuredCover: { width: '100%', height: 160, backgroundColor: colors.primarySoft },
  featuredBody: { padding: spacing[4], gap: spacing[2] },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    color: colors.primaryDark,
    fontFamily: fonts.semibold,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  featuredTitle: { fontFamily: fonts.bold, fontSize: 18 },
  featuredDesc: { fontFamily: fonts.regular, color: colors.textMuted },
  featuredCta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing[2] },
  featuredCtaText: { fontFamily: fonts.semibold, color: colors.primaryDark },
  quickTopics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  quickTopic: {
    width: '23%',
    minWidth: 72,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing[2],
  },
  quickTopicActive: { opacity: 1 },
  quickTopicIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTopicLabel: { fontFamily: fonts.semibold, fontSize: 11, textAlign: 'center' },
  empty: { alignItems: 'center', gap: spacing[3], paddingVertical: spacing[6] },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 18 },
  emptyText: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
  emptyBtn: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  emptyBtnText: { fontFamily: fonts.semibold, color: colors.primaryDark },
  error: { color: colors.error, fontFamily: fonts.medium },
});
