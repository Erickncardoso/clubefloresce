import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import {
  ArrowUpRight,
  Lightbulb,
  Search,
} from 'lucide-react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { usePatientApi } from '@/hooks/usePatientApi';
import { usePatientGoals } from '@/hooks/usePatientGoals';
import { getBellaDailyTip } from '@/lib/bella-tips';
import { firstNameFrom, timeGreeting } from '@/lib/format';
import { QUICK_ACTIONS, patientAssets } from '@/lib/patient-assets';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const GOAL_CARD_BG: Record<string, string> = {
  water: '#e8f0fb',
  food: '#f8f0ed',
  exercise: '#eef0eb',
  sleep: '#f3f4f6',
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { request } = usePatientApi();
  const { todaySummary, goalsAverage, ready: goalsReady } = usePatientGoals();
  const [loading, setLoading] = useState(true);
  const [hasMealPlan, setHasMealPlan] = useState(false);
  const [dailySummary, setDailySummary] = useState<{
    targets?: { caloriesKcal?: number };
    consumed?: { caloriesKcal?: number };
  } | null>(null);
  const [streakDays, setStreakDays] = useState(1);

  const firstName = firstNameFrom(user?.name);
  const greeting = timeGreeting();
  const bellaTip = getBellaDailyTip();
  const calorieTarget = dailySummary?.targets?.caloriesKcal || 2000;
  const calorieConsumed = dailySummary?.consumed?.caloriesKcal || 0;
  const caloriePct = Math.min(100, Math.round((calorieConsumed / calorieTarget) * 100));
  const streakLabel = streakDays === 1 ? 'dia' : 'dias';

  useEffect(() => {
    (async () => {
      try {
        const plan = await request<{ plan?: { meals?: unknown[] } }>('/meal-plan/me');
        setHasMealPlan(Boolean(plan?.plan?.meals?.length));
      } catch {
        setHasMealPlan(false);
      }
      try {
        const nutrition = await request<typeof dailySummary>('/food-diary/today');
        setDailySummary(nutrition);
      } catch {
        setDailySummary(null);
      }
      try {
        const checkin = await request<{ history?: unknown[]; current?: unknown }>('/checkin/me');
        setStreakDays(Math.max(1, (checkin.history?.length || 0) + (checkin.current ? 1 : 0)));
      } catch {
        setStreakDays(1);
      } finally {
        setLoading(false);
      }
    })();
  }, [request]);

  const goalCards = useMemo(() => todaySummary.map((item) => ({
    id: item.goal.id,
    label: item.goal.label,
    value: item.goal.id === 'food' ? item.progress : item.percent,
    showPercent: item.goal.id !== 'food',
  })), [todaySummary]);

  if (loading || !goalsReady) {
    return (
      <PatientShell>
        <PatientHeader light menuLeft showMenu showBell />
        <LoadingScreen />
      </PatientShell>
    );
  }

  return (
    <PatientShell>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
        <View style={styles.hero}>
          <PatientHeader light menuLeft showMenu showBell />
          <View style={styles.heroPanel}>
            <Link href="/perfil" asChild>
              <Pressable style={styles.profile}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{firstName.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={styles.profileCopy}>
                  <Text style={styles.name}>{firstName}</Text>
                  <Text style={styles.sub}>{greeting} · Clube Florescer</Text>
                </View>
              </Pressable>
            </Link>
            <View style={styles.kcalBlock}>
              <Text style={styles.kcalLabel}>Kcal hoje</Text>
              <Text style={styles.kcalValue}>{calorieConsumed.toLocaleString('pt-BR')}</Text>
            </View>
          </View>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{streakDays}</Text>
              <Text style={styles.statLabel}>{streakLabel} florescendo</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{caloriePct}%</Text>
              <Text style={styles.statLabel}>Meta calórica</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{goalsAverage}%</Text>
              <Text style={styles.statLabel}>Metas do dia</Text>
            </View>
          </View>
        </View>

        <Pressable
          style={styles.searchPill}
          onPress={() => router.push('/bella/chat/general' as never)}
        >
          <Search color="#111827" size={16} strokeWidth={2} />
          <Text style={styles.searchText}>Pergunte algo para a Bella</Text>
        </Pressable>

        <View style={styles.sheet}>
          <View style={styles.quickStrip}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickCarousel}
            >
              {QUICK_ACTIONS.map((action) => (
                <Pressable
                  key={action.label}
                  style={styles.quickItem}
                  onPress={() => router.push(action.href as never)}
                >
                  <Image source={action.image} style={styles.quickPhoto} resizeMode="contain" />
                  <Text style={styles.quickLabel}>{action.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {hasMealPlan ? (
            <Section title="Refeição do dia" link="/dieta" linkLabel="Ver dieta">
              <Text style={styles.cardText}>Acompanhe suas refeições e marque o que já comeu hoje.</Text>
            </Section>
          ) : null}

          <Section title="Sua nutrição" link="/evolucao/nutricao" linkLabel="Ver mês">
            <View style={styles.nutritionCard}>
              <Text style={styles.nutritionStrong}>
                {calorieConsumed} / {calorieTarget} kcal
              </Text>
              <Text style={styles.cardText}>{caloriePct}% da meta calórica de hoje</Text>
            </View>
          </Section>

          <Section title="Metas diárias" link="/evolucao" linkLabel="Evolução">
            <View style={styles.goalsSummary}>
              <Text style={styles.goalsSummaryTitle}>Seu dia</Text>
              <Text style={styles.goalsSummaryCopy}>
                Média das metas: <Text style={styles.goalsSummaryStrong}>{goalsAverage}%</Text>
              </Text>
            </View>
            <View style={styles.goalsGrid}>
              {goalCards.map((goal) => (
                <View
                  key={goal.id}
                  style={[styles.goalCard, { backgroundColor: GOAL_CARD_BG[goal.id] || '#f3f4f6' }]}
                >
                  <View style={styles.goalArrow}>
                    <ArrowUpRight color={colors.text} size={15} strokeWidth={2.1} />
                  </View>
                  <Text style={styles.goalValue}>
                    {goal.value}{goal.showPercent ? '%' : ''}
                  </Text>
                  <Text style={styles.goalLabel}>{goal.label}</Text>
                </View>
              ))}
            </View>
          </Section>

          <View style={styles.bellaOverflow}>
            <Pressable
              style={styles.bellaCard}
              onPress={() => router.push('/bella/chat/general' as never)}
            >
              <View style={styles.bellaCopy}>
                <Text style={styles.bellaTitle}>Fale com a Bella</Text>
                <Text style={styles.bellaSub}>Sua nutricionista IA para dúvidas do dia a dia.</Text>
              </View>
              <View style={styles.bellaFigure} pointerEvents="none">
                <Image
                  source={patientAssets.bellaAvatar}
                  style={styles.bellaAvatar}
                  resizeMode="cover"
                />
              </View>
            </Pressable>
          </View>

          <View style={styles.teachOverflow}>
            <Pressable style={styles.teachCard} onPress={() => router.push('/cursos' as never)}>
              <View style={styles.teachFigure} pointerEvents="none">
                <Image
                  source={patientAssets.bellaEnsina}
                  style={styles.teachPhoto}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.teachBadge} pointerEvents="none">
                <Lightbulb color={colors.primaryDark} size={23} strokeWidth={2.25} />
              </View>
              <View style={styles.teachBody}>
                <Text style={styles.teachTag}>Bella ensina</Text>
                <Text style={styles.teachTip}>{bellaTip}</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </PatientShell>
  );
}

function Section({
  title,
  link,
  linkLabel,
  children,
}: {
  title: string;
  link: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Link href={link as never} style={styles.sectionLink}>{linkLabel}</Link>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: spacing[6] },
  hero: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: spacing[6],
  },
  heroPanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    marginTop: spacing[1],
    marginBottom: spacing[5],
    gap: spacing[3],
  },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 },
  profileCopy: { flex: 1, minWidth: 0 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontFamily: fonts.bold, fontSize: 20 },
  name: { color: '#fff', fontFamily: fonts.extrabold, fontSize: 19, letterSpacing: -0.3 },
  sub: { color: 'rgba(255,255,255,0.55)', fontFamily: fonts.medium, fontSize: 12, marginTop: 4 },
  kcalBlock: { flexShrink: 0, alignItems: 'flex-end' },
  kcalLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  kcalValue: {
    color: '#fff',
    fontFamily: fonts.extrabold,
    fontSize: 22,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: spacing[5],
    gap: spacing[2],
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontFamily: fonts.extrabold, fontSize: 18 },
  statLabel: {
    color: 'rgba(255,255,255,0.52)',
    fontFamily: fonts.medium,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  searchPill: {
    zIndex: 3,
    marginTop: -22,
    marginHorizontal: spacing[5],
    backgroundColor: '#fff',
    borderRadius: radii.pill,
    paddingVertical: 14,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  searchText: { fontFamily: fonts.semibold, fontSize: 13, color: '#6b7280' },
  sheet: {
    paddingHorizontal: spacing[5],
    paddingTop: 6,
    gap: spacing[5],
  },
  quickStrip: {
    marginVertical: spacing[4],
    marginHorizontal: -spacing[5],
  },
  quickCarousel: {
    gap: 14,
    paddingHorizontal: spacing[5],
    paddingVertical: 2,
  },
  quickItem: {
    width: 78,
    alignItems: 'center',
    gap: 7,
  },
  quickPhoto: {
    width: 58,
    height: 58,
  },
  quickLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    textAlign: 'center',
    color: colors.text,
    lineHeight: 14,
  },
  section: { gap: spacing[3], marginBottom: spacing[1] },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text, letterSpacing: -0.2 },
  sectionLink: { fontFamily: fonts.semibold, color: colors.primaryDark, fontSize: 13 },
  cardText: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 14 },
  nutritionCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(28, 24, 22, 0.06)',
    padding: spacing[4],
    gap: 4,
  },
  nutritionStrong: { fontFamily: fonts.bold, fontSize: 18 },
  goalsSummary: {
    padding: spacing[4],
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(28, 24, 22, 0.06)',
    marginBottom: spacing[2],
  },
  goalsSummaryTitle: { fontFamily: fonts.bold, fontSize: 15, marginBottom: 6 },
  goalsSummaryCopy: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  goalsSummaryStrong: { fontFamily: fonts.extrabold, color: colors.text },
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goalCard: {
    width: '48%',
    minHeight: 108,
    borderRadius: 22,
    padding: spacing[4],
    position: 'relative',
  },
  goalArrow: {
    position: 'absolute',
    top: 15,
    right: 15,
    opacity: 0.65,
  },
  goalValue: { fontFamily: fonts.extrabold, fontSize: 27, color: colors.text, letterSpacing: -0.6 },
  goalLabel: { fontFamily: fonts.semibold, fontSize: 13, marginTop: 6 },
  bellaOverflow: {
    zIndex: 5,
    marginTop: 4,
    marginBottom: 12,
    paddingTop: 22,
    overflow: 'visible',
  },
  bellaCard: {
    position: 'relative',
    backgroundColor: colors.primary,
    borderRadius: 30,
    paddingTop: 18,
    paddingBottom: 14,
    paddingLeft: 20,
    paddingRight: 104,
    minHeight: 72,
    shadowColor: '#566137',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    overflow: 'visible',
  },
  bellaCopy: { flex: 1, minWidth: 0 },
  bellaTitle: { color: '#fff', fontFamily: fonts.bold, fontSize: 17, letterSpacing: -0.3 },
  bellaSub: {
    color: 'rgba(255,255,255,0.92)',
    fontFamily: fonts.medium,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  bellaFigure: {
    position: 'absolute',
    right: 10,
    top: -40,
    width: 88,
    height: 110,
    overflow: 'visible',
  },
  bellaAvatar: {
    width: 82,
    height: 110,
    alignSelf: 'center',
  },
  teachOverflow: {
    zIndex: 5,
    marginTop: 6,
    marginBottom: 14,
    paddingTop: 30,
    overflow: 'visible',
  },
  teachCard: {
    position: 'relative',
    backgroundColor: colors.primarySoft,
    borderRadius: 24,
    paddingTop: 17,
    paddingBottom: 18,
    paddingLeft: 130,
    paddingRight: 50,
    minHeight: 102,
    overflow: 'visible',
  },
  teachFigure: {
    position: 'absolute',
    left: -12,
    top: -30,
    width: 150,
    bottom: 0,
  },
  teachPhoto: {
    width: '100%',
    height: '100%',
  },
  teachBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#eef0eb',
    borderWidth: 4,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  teachBody: { minWidth: 0 },
  teachTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryDark,
    color: '#fff',
    fontFamily: fonts.bold,
    fontSize: 11,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  teachTip: {
    marginTop: 8,
    fontFamily: fonts.regular,
    color: colors.primaryDark,
    fontSize: 13,
    lineHeight: 20,
  },
});
