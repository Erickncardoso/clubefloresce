import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { usePatientApi } from '@/hooks/usePatientApi';
import { getLocalDateKey } from '@/lib/patient-local-time';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type DaySummary = {
  date: string;
  entryCount: number;
  consumed: { caloriesKcal: number; carbsG: number; proteinG: number; fatG: number };
};

type MonthSummary = {
  totals: { caloriesKcal: number };
  daysWithEntries: number;
  targets?: { caloriesKcal?: number };
  days: DaySummary[];
};

function dayNumber(dateKey: string) {
  return Number(dateKey.slice(8, 10));
}

function barHeight(day: DaySummary, target: number) {
  if (!day.entryCount) return 8;
  return Math.max(12, Math.min(100, Math.round((day.consumed.caloriesKcal / target) * 100)));
}

function barColor(day: DaySummary, target: number) {
  if (!day.entryCount) return colors.track;
  const pct = barHeight(day, target);
  if (pct >= 100) return '#c4842e';
  if (pct >= 70) return colors.primary;
  return '#5ba4d9';
}

export default function NutritionMonthView() {
  const { request } = usePatientApi();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [selectedDate, setSelectedDate] = useState('');

  const todayKey = getLocalDateKey();
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1;

  const monthLabel = useMemo(
    () => new Date(viewYear, viewMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    [viewMonth, viewYear],
  );

  const avgCalories = useMemo(() => {
    if (!summary?.daysWithEntries) return '0';
    return Math.round(summary.totals.caloriesKcal / summary.daysWithEntries).toLocaleString('pt-BR');
  }, [summary]);

  const selectedDay = useMemo(
    () => summary?.days.find((day) => day.date === selectedDate) || null,
    [selectedDate, summary],
  );

  async function loadMonth(year = viewYear, month = viewMonth) {
    setLoading(true);
    setError('');
    try {
      const data = await request<MonthSummary>(`/food-diary/month?year=${year}&month=${month}`);
      setSummary(data);
      const todayInView = data.days.find((day) => day.date === todayKey);
      setSelectedDate(todayInView?.date || data.days[data.days.length - 1]?.date || '');
    } catch {
      setError('Não foi possível carregar o panorama do mês.');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMonth();
  }, [viewYear, viewMonth]);

  function shiftMonth(delta: number) {
    let month = viewMonth + delta;
    let year = viewYear;
    if (month < 1) { month = 12; year -= 1; }
    else if (month > 12) { month = 1; year += 1; }
    setViewMonth(month);
    setViewYear(year);
  }

  if (loading && !summary) return <LoadingScreen />;

  return (
    <View style={styles.wrap}>
      <View style={styles.nav}>
        <Pressable style={styles.navBtn} onPress={() => shiftMonth(-1)}>
          <ChevronLeft color={colors.text} size={18} />
        </Pressable>
        <Text style={styles.monthTitle}>{monthLabel}</Text>
        <Pressable style={[styles.navBtn, isCurrentMonth && styles.navBtnDisabled]} disabled={isCurrentMonth} onPress={() => shiftMonth(1)}>
          <ChevronRight color={colors.text} size={18} />
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {summary ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.summary}>
            <Stat value={summary.totals.caloriesKcal.toLocaleString('pt-BR')} label="kcal no mês" />
            <Stat value={String(summary.daysWithEntries)} label="dias registrados" />
            <Stat value={avgCalories} label="média/dia" />
          </View>

          <View style={styles.grid}>
            {summary.days.map((day) => {
              const target = summary.targets?.caloriesKcal || 2000;
              const selected = day.date === selectedDate;
              return (
                <Pressable
                  key={day.date}
                  style={[
                    styles.day,
                    day.date === todayKey && styles.dayToday,
                    selected && styles.daySelected,
                  ]}
                  onPress={() => setSelectedDate(day.date)}
                >
                  <Text style={styles.dayNum}>{dayNumber(day.date)}</Text>
                  <View
                    style={[
                      styles.dayBar,
                      { height: `${barHeight(day, target)}%`, backgroundColor: barColor(day, target) },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>

          {selectedDay ? (
            <View style={styles.detail}>
              <Text style={styles.detailTitle}>
                {new Date(`${selectedDay.date}T12:00:00`).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
              {!selectedDay.entryCount ? (
                <Text style={styles.detailMuted}>Nenhuma refeição registrada neste dia.</Text>
              ) : (
                <>
                  <View style={styles.macros}>
                    <Text style={styles.macroText}><Text style={styles.macroStrong}>{selectedDay.consumed.caloriesKcal}</Text> kcal</Text>
                    <Text style={styles.macroText}>C {selectedDay.consumed.carbsG}g</Text>
                    <Text style={styles.macroText}>P {selectedDay.consumed.proteinG}g</Text>
                    <Text style={styles.macroText}>G {selectedDay.consumed.fatG}g</Text>
                  </View>
                  <Text style={styles.detailMuted}>
                    {selectedDay.entryCount} refeiç{selectedDay.entryCount === 1 ? 'ão' : 'ões'} registrada{selectedDay.entryCount === 1 ? '' : 's'}
                    {summary.targets?.caloriesKcal ? ` · meta ${summary.targets.caloriesKcal} kcal` : ''}
                  </Text>
                </>
              )}
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
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
  wrap: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  navBtnDisabled: { opacity: 0.4 },
  monthTitle: { fontFamily: fonts.bold, fontSize: 16, textTransform: 'capitalize' },
  error: { color: colors.error, fontFamily: fonts.medium, marginBottom: spacing[3] },
  content: { paddingBottom: spacing[6], gap: spacing[4] },
  summary: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    padding: spacing[3],
    backgroundColor: colors.surface,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: fonts.bold, fontSize: 15 },
  statLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  day: {
    width: '13%',
    minHeight: 54,
    borderRadius: 10,
    backgroundColor: '#fafafa',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayToday: { borderColor: colors.primary },
  daySelected: { backgroundColor: colors.primarySoft },
  dayNum: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted },
  dayBar: { width: 6, minHeight: 4, borderRadius: 999, marginTop: 4 },
  detail: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    padding: spacing[4],
    backgroundColor: colors.surface,
    gap: spacing[2],
  },
  detailTitle: { fontFamily: fonts.bold, fontSize: 15, textTransform: 'capitalize' },
  detailMuted: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  macros: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  macroText: { fontFamily: fonts.regular, fontSize: 13 },
  macroStrong: { fontFamily: fonts.bold },
});
