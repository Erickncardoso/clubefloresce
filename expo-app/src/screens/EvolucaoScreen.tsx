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
import { useWeeklyCheckInPrompt } from '@/hooks/useWeeklyCheckInPrompt';
import { colors, fonts } from '@/theme/tokens';

type TabId = 'metas' | 'peso';

export default function EvolucaoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { todaySummary, goalsAverage, ready, hydrate } = usePatientGoals();
  const { pendingCheckIn, checkInStatus, loadCheckInAccess } = useWeeklyCheckInPrompt();
  const [activeTab, setActiveTab] = useState<TabId>('metas');

  const goalsCompleted = useMemo(
    () => todaySummary.filter((item) => item.percent >= 100).length,
    [todaySummary],
  );

  const inProgress = Math.max(0, todaySummary.length - goalsCompleted);

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
        <PatientHeader title="Evolução" showBack backTo="/inicio" showBell={false} />
        <LoadingScreen />
      </PatientShell>
    );
  }

  return (
    <PatientShell>
      <PatientHeader
        title="Evolução"
        showBack
        backTo="/inicio"
        showBell={false}
        style={styles.header}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.overview} accessibilityRole="summary">
          <View style={styles.overviewHead}>
            <View style={styles.overviewCopy}>
              <Text style={styles.eyebrow}>Esta semana</Text>
              <Text style={styles.overviewTitle}>Seu progresso</Text>
            </View>
            <View style={styles.overviewScore}>
              <Text style={styles.scoreValue}>{goalsAverage}%</Text>
              <Text style={styles.scoreLabel}>concluído</Text>
            </View>
          </View>

          <View
            style={styles.overviewProgressTrack}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: goalsAverage }}
          >
            <View style={[styles.overviewProgressFill, { width: `${Math.min(100, goalsAverage)}%` }]} />
          </View>

          <View style={styles.overviewStats}>
            <View style={styles.overviewStat}>
              <Text style={styles.statStrong}>{goalsCompleted}</Text>
              <Text style={styles.statLabel}>concluídas</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewStat}>
              <Text style={styles.statStrong}>{todaySummary.length}</Text>
              <Text style={styles.statLabel}>metas ativas</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewStat}>
              <Text style={styles.statStrong}>{inProgress}</Text>
              <Text style={styles.statLabel}>em andamento</Text>
            </View>
          </View>
        </View>

        {pendingCheckIn ? (
          <Pressable
            style={styles.checkinBanner}
            onPress={() => router.push('/check-in' as never)}
          >
            <View style={styles.checkinIconWrap}>
              <CalendarCheck color={colors.primaryDark} size={16} strokeWidth={1.8} />
            </View>
            <View style={styles.checkinCopy}>
              <Text style={styles.checkinTitle}>Check-in semanal</Text>
              <Text style={styles.checkinSub} numberOfLines={1}>
                Disponível até {checkInStatus.deadlineLabel || 'segunda-feira'}
              </Text>
            </View>
            <Text style={styles.checkinAction}>Responder</Text>
            <ChevronRight color="#b0b0b4" size={14} strokeWidth={2} />
          </Pressable>
        ) : null}

        <View style={styles.tabs} accessibilityRole="tablist">
          {([
            { id: 'metas' as const, label: 'Metas', Icon: Target },
            { id: 'peso' as const, label: 'Peso', Icon: LineChart },
          ]).map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <Pressable
                key={id}
                style={[styles.tab, active && styles.tabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setTab(id)}
              >
                <Icon size={14} color={active ? colors.text : '#77777c'} strokeWidth={1.8} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {activeTab === 'metas' ? (
          <View accessibilityLabel="Metas">
            <View style={styles.sectionHead}>
              <View>
                <Text style={styles.sectionKicker}>Acompanhamento diário</Text>
                <Text style={styles.sectionTitle}>Metas de hoje</Text>
              </View>
              <Link href="/evolucao/nutricao" asChild>
                <Pressable style={styles.sectionLink}>
                  <Text style={styles.sectionLinkText}>Nutrição</Text>
                  <ChevronRight size={12} color={colors.primaryDark} strokeWidth={2} />
                </Pressable>
              </Link>
            </View>
            <EvolucaoGoalsPanel />
          </View>
        ) : (
          <View accessibilityLabel="Peso e medidas">
            <View style={styles.sectionHead}>
              <View>
                <Text style={styles.sectionKicker}>Histórico corporal</Text>
                <Text style={styles.sectionTitle}>Peso e medidas</Text>
              </View>
            </View>
            <EvolucaoWeightPanel />
          </View>
        )}
      </ScrollView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ededf0',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  overview: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  overviewHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  overviewCopy: { flex: 1, minWidth: 0 },
  eyebrow: {
    marginBottom: 3,
    fontFamily: fonts.medium,
    fontSize: 11,
    color: '#8a8a8e',
  },
  overviewTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    letterSpacing: -0.29,
    color: colors.text,
  },
  overviewScore: { alignItems: 'flex-end', flexShrink: 0 },
  scoreValue: {
    fontFamily: fonts.medium,
    fontSize: 25,
    lineHeight: 25,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    color: colors.text,
  },
  scoreLabel: {
    marginTop: 3,
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#8a8a8e',
  },
  overviewProgressTrack: {
    height: 6,
    marginTop: 14,
    marginBottom: 13,
    borderRadius: 999,
    backgroundColor: '#ececee',
    overflow: 'hidden',
  },
  overviewProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  overviewStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewStat: { flex: 1, minWidth: 0 },
  statStrong: {
    fontFamily: fonts.medium,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    color: colors.text,
  },
  statLabel: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#8a8a8e',
  },
  overviewDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 10,
    backgroundColor: '#ededf0',
  },
  checkinBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  checkinIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f3ef',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkinCopy: { flex: 1, minWidth: 0 },
  checkinTitle: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
  },
  checkinSub: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#8a8a8e',
  },
  checkinAction: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.primaryDark,
  },
  tabs: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
    marginBottom: 6,
    padding: 3,
    borderRadius: 12,
    backgroundColor: '#f2f2f4',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 11,
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.09,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#77777c',
  },
  tabTextActive: {
    color: colors.text,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 11,
  },
  sectionKicker: {
    marginBottom: 3,
    fontFamily: fonts.medium,
    fontSize: 11,
    color: '#8a8a8e',
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    letterSpacing: -0.24,
    color: colors.text,
  },
  sectionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    minHeight: 32,
  },
  sectionLinkText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primaryDark,
  },
});
