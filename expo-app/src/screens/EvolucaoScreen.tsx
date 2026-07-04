import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarCheck, ChevronRight, LineChart, Target } from 'lucide-react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import FormField from '@/components/ui/FormField';
import CfButton from '@/components/ui/CfButton';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { usePatientGoals } from '@/hooks/usePatientGoals';
import { useWeeklyCheckIn } from '@/hooks/useWeeklyCheckIn';
import { usePatientApi } from '@/hooks/usePatientApi';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type TabId = 'metas' | 'peso';

export default function EvolucaoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { todaySummary, goalsAverage, setGoalProgress, ready } = usePatientGoals();
  const { pendingCheckIn, status, loadCheckInAccess } = useWeeklyCheckIn();
  const { request } = usePatientApi();
  const [activeTab, setActiveTab] = useState<TabId>('metas');
  const [weightKg, setWeightKg] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [weightError, setWeightError] = useState('');

  const goalsCompleted = useMemo(
    () => todaySummary.filter((item) => item.percent >= 100).length,
    [todaySummary],
  );

  useEffect(() => {
    loadCheckInAccess();
  }, [loadCheckInAccess]);

  useEffect(() => {
    const tab = params.tab === 'peso' ? 'peso' : 'metas';
    setActiveTab(tab);
  }, [params.tab]);

  useEffect(() => {
    (async () => {
      try {
        const profile = await request<{ weightKg?: number | null }>('/patient-profile/me');
        if (profile?.weightKg != null) setWeightKg(String(profile.weightKg));
      } catch { /* ignore */ }
    })();
  }, [request]);

  async function saveWeight() {
    setWeightError('');
    const parsed = Number(weightKg.replace(',', '.'));
    if (!parsed || parsed < 20 || parsed > 500) {
      setWeightError('Informe um peso válido entre 20 e 500 kg.');
      return;
    }
    setSavingWeight(true);
    try {
      await request('/patient-profile/me', {
        method: 'PATCH',
        body: JSON.stringify({ weightKg: parsed }),
      });
    } catch (err) {
      setWeightError((err as Error).message);
    } finally {
      setSavingWeight(false);
    }
  }

  if (!ready) {
    return (
      <PatientShell>
        <PatientHeader title="Evolução" showBack={false} showBell={false} showMenu={false} />
        <LoadingScreen />
      </PatientShell>
    );
  }

  return (
    <PatientShell>
      <View style={styles.hero}>
        <PatientHeader title="Evolução" showBack={false} showBell={false} showMenu={false} light />
        <Text style={styles.kicker}>Acompanhe seu progresso</Text>
        <View style={styles.stats}>
          <Stat value={`${goalsAverage}%`} label="Média das metas" />
          <Stat value={String(goalsCompleted)} label="Concluídas" />
          <Stat value={String(todaySummary.length)} label="Metas ativas" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.sheet}>
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>Média do dia</Text>
          <Text style={styles.pillValue}>{goalsAverage}%</Text>
          <Text style={styles.pillMeta}>{goalsCompleted}/{todaySummary.length} concluídas</Text>
        </View>

        {pendingCheckIn ? (
          <Pressable style={styles.checkinBanner} onPress={() => router.push('/check-in' as never)}>
            <CalendarCheck color={colors.primaryDark} size={22} />
            <View style={styles.checkinCopy}>
              <Text style={styles.checkinTitle}>Check-in semanal disponível</Text>
              <Text style={styles.checkinSub}>
                Preencha até {status.deadlineLabel || 'segunda-feira'}
              </Text>
            </View>
            <ChevronRight color={colors.textMuted} size={20} />
          </Pressable>
        ) : null}

        <View style={styles.tabs}>
          {([
            { id: 'metas' as const, label: 'Metas', Icon: Target },
            { id: 'peso' as const, label: 'Peso', Icon: LineChart },
          ]).map(({ id, label, Icon }) => (
            <Pressable
              key={id}
              style={[styles.tab, activeTab === id && styles.tabActive]}
              onPress={() => setActiveTab(id)}
            >
              <Icon size={16} color={activeTab === id ? colors.primaryDark : colors.textMuted} />
              <Text style={[styles.tabText, activeTab === id && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'metas' ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Registrar metas</Text>
              <Link href="/evolucao/nutricao" asChild>
                <Pressable style={styles.sectionLink}>
                  <Text style={styles.sectionLinkText}>Nutrição</Text>
                  <ChevronRight size={16} color={colors.primary} />
                </Pressable>
              </Link>
            </View>
            {todaySummary.map(({ goal, progress, percent }) => (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHead}>
                  <Text style={styles.goalLabel}>{goal.label}</Text>
                  <Text style={styles.goalPct}>{percent}%</Text>
                </View>
                <Text style={styles.goalMeta}>
                  {progress} / {goal.target} {goal.unit}
                </Text>
                <View style={styles.goalActions}>
                  <CfButton
                    variant="ghost"
                    label="-"
                    onPress={() => setGoalProgress(goal.id, Math.max(0, progress - 1))}
                  />
                  <CfButton
                    label="+"
                    onPress={() => setGoalProgress(goal.id, progress + 1)}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Peso e medidas</Text>
            <FormField
              label="Peso atual (kg)"
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="decimal-pad"
              placeholder="Ex: 68.5"
            />
            {weightError ? <Text style={styles.error}>{weightError}</Text> : null}
            <CfButton label="Salvar peso" loading={savingWeight} onPress={saveWeight} />
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
    paddingBottom: spacing[6],
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  kicker: { color: 'rgba(255,255,255,0.65)', fontFamily: fonts.medium, marginBottom: spacing[4] },
  stats: { flexDirection: 'row', gap: spacing[2] },
  stat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radii.control,
    padding: spacing[3],
    alignItems: 'center',
  },
  statValue: { color: '#fff', fontFamily: fonts.bold, fontSize: 18 },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.regular, fontSize: 11, textAlign: 'center' },
  sheet: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[6] },
  pill: {
    backgroundColor: colors.surface,
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    alignItems: 'center',
    gap: 4,
  },
  pillLabel: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 12 },
  pillValue: { fontFamily: fonts.bold, fontSize: 28, color: colors.primaryDark },
  pillMeta: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 13 },
  checkinBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.primarySoft,
    borderRadius: radii.control,
    padding: spacing[4],
  },
  checkinCopy: { flex: 1 },
  checkinTitle: { fontFamily: fonts.bold, fontSize: 14 },
  checkinSub: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 13 },
  tabs: { flexDirection: 'row', gap: spacing[2] },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing[3],
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  tabText: { fontFamily: fonts.semibold, color: colors.textMuted },
  tabTextActive: { color: colors.primaryDark },
  section: { gap: spacing[3] },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 18 },
  sectionLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionLinkText: { fontFamily: fonts.semibold, color: colors.primary },
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[2],
  },
  goalHead: { flexDirection: 'row', justifyContent: 'space-between' },
  goalLabel: { fontFamily: fonts.semibold },
  goalPct: { fontFamily: fonts.bold, color: colors.primaryDark },
  goalMeta: { fontFamily: fonts.regular, color: colors.textMuted },
  goalActions: { flexDirection: 'row', gap: spacing[2], justifyContent: 'flex-end' },
  error: { color: colors.error, fontFamily: fonts.medium },
});
