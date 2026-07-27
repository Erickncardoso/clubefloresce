import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarCheck, ChevronRight, LineChart, Target } from 'lucide-react-native';
import EvolucaoGoalsPanel from '@/components/evolucao/EvolucaoGoalsPanel';
import EvolucaoWeightPanel from '@/components/evolucao/EvolucaoWeightPanel';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { usePatientGoals } from '@/hooks/usePatientGoals';
import { useWeeklyCheckIn } from '@/hooks/useWeeklyCheckIn';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type TabId = 'metas' | 'peso';

export default function EvolucaoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { todaySummary, goalsAverage, ready, hydrate } = usePatientGoals();
  const { pendingCheckIn, status, loadCheckInAccess } = useWeeklyCheckIn();
  const [activeTab, setActiveTab] = useState<TabId>('metas');

  const goalsCompleted = useMemo(
    () => todaySummary.filter((item) => item.percent >= 100).length,
    [todaySummary],
  );

  useEffect(() => {
    loadCheckInAccess();
    hydrate();
  }, [hydrate, loadCheckInAccess]);

  useEffect(() => {
    if (params.tab === 'dieta') {
      router.replace('/dieta' as never);
      return;
    }
    setActiveTab(params.tab === 'peso' ? 'peso' : 'metas');
  }, [params.tab, router]);

  function setTab(id: TabId) {
    setActiveTab(id);
    router.setParams({ tab: id });
  }

  if (!ready) {
    return (
      <PatientShell>
        <PatientHeader title="Evolução" showBack backTo="/inicio" showBell={false} light />
        <LoadingScreen />
      </PatientShell>
    );
  }

  return (
    <PatientShell>
      <View style={styles.hero}>
        <PatientHeader
          title="Evolução"
          showBack
          backTo="/inicio"
          showBell={false}
          showMenu={false}
          light
        />
        <Text style={styles.kicker}>Acompanhe seu progresso</Text>
        <View style={styles.stats}>
          <Stat value={`${goalsAverage}%`} label="Média das metas" />
          <Stat value={String(goalsCompleted)} label="Concluídas" />
          <Stat value={String(todaySummary.length)} label="Metas ativas" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.sheet} showsVerticalScrollIndicator={false}>
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>Média do dia</Text>
          <Text style={styles.pillValue}>{goalsAverage}%</Text>
          <Text style={styles.pillMeta}>
            {goalsCompleted}/{todaySummary.length} concluídas
          </Text>
        </View>

        {pendingCheckIn ? (
          <Pressable style={styles.checkinBanner} onPress={() => router.push('/check-in' as never)}>
            <View style={styles.checkinIconWrap}>
              <CalendarCheck color={colors.primaryDark} size={18} />
            </View>
            <View style={styles.checkinCopy}>
              <Text style={styles.checkinTitle}>Check-in semanal disponível</Text>
              <Text style={styles.checkinSub}>
                Preencha até {status.deadlineLabel || 'segunda-feira'}
              </Text>
            </View>
            <ChevronRight color={colors.textMuted} size={16} />
          </Pressable>
        ) : null}

        <View style={styles.tabs}>
          {([
            { id: 'metas' as const, label: 'Metas', Icon: Target },
            { id: 'peso' as const, label: 'Peso', Icon: LineChart },
          ]).map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <Pressable
                key={id}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setTab(id)}
              >
                <Icon size={15} color={active ? '#fff' : colors.textMuted} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {activeTab === 'metas' ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Registrar metas</Text>
              <Link href="/evolucao/nutricao" asChild>
                <Pressable style={styles.sectionLink}>
                  <Text style={styles.sectionLinkText}>Nutrição</Text>
                  <ChevronRight size={14} color={colors.primaryDark} />
                </Pressable>
              </Link>
            </View>
            <EvolucaoGoalsPanel />
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Peso e medidas</Text>
            <EvolucaoWeightPanel />
          </View>
        )}
      </ScrollView>
    </PatientShell>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[5],
    paddingBottom: 38,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  kicker: {
    color: 'rgba(255,255,255,0.62)',
    fontFamily: fonts.medium,
    fontSize: 12,
    marginBottom: spacing[4],
  },
  stats: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontFamily: fonts.extrabold,
    fontSize: 19,
  },
  statLabel: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.55)',
    fontFamily: fonts.medium,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
  sheet: {
    paddingHorizontal: spacing[5],
    paddingBottom: 120,
    paddingTop: 6,
    gap: spacing[4],
    backgroundColor: colors.bg,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: -22,
    marginBottom: 4,
    paddingVertical: 14,
    paddingHorizontal: 17,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  pillLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
  },
  pillValue: {
    marginLeft: 'auto',
    fontFamily: fonts.extrabold,
    fontSize: 22,
    color: colors.text,
  },
  pillMeta: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.primaryDark,
  },
  checkinBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
    borderRadius: 22,
    backgroundColor: colors.surface,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  checkinIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: '#fff5f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinCopy: { flex: 1 },
  checkinTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  checkinSub: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  tabs: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabActive: {
    backgroundColor: colors.primaryDark,
    shadowColor: '#566137',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
  },
  tabText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.textMuted,
  },
  tabTextActive: { color: '#fff' },
  section: { gap: 12 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
  },
  sectionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionLinkText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primaryDark,
  },
});
