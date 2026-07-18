import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import LoadingScreen from '@/components/ui/LoadingScreen';
import {
  formatCheckinPeriod,
  scoreFromTemplateAnswers,
  summarizeCheckinAnswers,
} from '@/lib/checkin-answers';
import { usePatientApi } from '@/hooks/usePatientApi';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type HistoryItem = {
  id: string;
  periodKey?: string;
  createdAt?: string;
  updatedAt?: string;
  template?: { title?: string; frequency?: string; steps?: Array<{ id: string; label?: string; question?: string; type?: string }> };
  answers?: Record<string, unknown>;
};

const FILTERS = [
  { id: 'all', label: 'Todas as semanas' },
  { id: 'month', label: 'Este mês' },
  { id: 'quarter', label: 'Últimos 3 meses' },
];

function pct(item: HistoryItem) {
  return scoreFromTemplateAnswers(item.answers) ?? 0;
}

function statusLabel(item: HistoryItem) {
  const value = pct(item);
  if (value >= 80) return '✓ Concluído';
  if (value >= 50) return '◐ Parcial';
  return '— Fraco';
}

function statusColor(item: HistoryItem) {
  const value = pct(item);
  if (value >= 80) return colors.primaryDark;
  if (value >= 50) return '#c4842e';
  return '#9ca3af';
}

export default function CheckInHistoricoScreen() {
  const { request } = usePatientApi();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await request<{ responses?: HistoryItem[] }>('/checkin/me/responses');
        setHistory(data.responses || []);
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [request]);

  const chartItems = useMemo(
    () => [...history].slice(0, 8).reverse().map((item) => ({ ...item, pct: pct(item) })),
    [history],
  );

  const filteredHistory = useMemo(() => {
    const now = new Date();
    return history.filter((item) => {
      const d = new Date(item.updatedAt || item.createdAt || '');
      if (activeFilter === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (activeFilter === 'quarter') {
        return now.getTime() - d.getTime() <= 90 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [activeFilter, history]);

  return (
    <PatientShell>
      <PatientHeader title="Histórico" showBack backTo="/check-in" showBell={false} showMenu={false} />
      {loading ? (
        <LoadingScreen />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {FILTERS.map((chip) => (
              <Pressable
                key={chip.id}
                style={[styles.chip, activeFilter === chip.id && styles.chipActive]}
                onPress={() => setActiveFilter(chip.id)}
              >
                <Text style={[styles.chipText, activeFilter === chip.id && styles.chipTextActive]}>{chip.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Seu progresso de check-ins</Text>
            <View style={styles.bars}>
              {chartItems.map((item, index) => (
                <View key={item.id} style={styles.barWrap}>
                  <View style={[styles.bar, { height: `${Math.max(8, item.pct)}%` }]} />
                  <Text style={styles.barLabel}>S{chartItems.length - index}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.list}>
            {filteredHistory.map((item, index) => (
              <View key={item.id} style={styles.row}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>
                    {(item.template?.title || 'Check-in')} #{history.length - index}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {formatCheckinPeriod(item.periodKey, item.template?.frequency)}
                  </Text>
                  <Text style={styles.rowSummary}>
                    {summarizeCheckinAnswers(item.template?.steps, item.answers)}
                  </Text>
                </View>
                <Text style={[styles.status, { color: statusColor(item) }]}>{statusLabel(item)}</Text>
              </View>
            ))}
            {!filteredHistory.length ? (
              <Text style={styles.empty}>Nenhum registro neste período.</Text>
            ) : null}
          </View>
        </ScrollView>
      )}
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: spacing[6], gap: spacing[4] },
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
  chipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  chipTextActive: { color: colors.primaryDark },
  chartCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    padding: spacing[4],
    backgroundColor: colors.surface,
  },
  chartTitle: { fontFamily: fonts.bold, fontSize: 15, marginBottom: spacing[3] },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2], height: 80 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '100%', backgroundColor: colors.primary, borderTopLeftRadius: 6, borderTopRightRadius: 6, minHeight: 8 },
  barLabel: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  list: { gap: 0 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowMain: { flex: 1 },
  rowTitle: { fontFamily: fonts.bold, fontSize: 14 },
  rowMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rowSummary: { fontFamily: fonts.regular, fontSize: 12, marginTop: 4 },
  status: { fontFamily: fonts.bold, fontSize: 12 },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: spacing[6] },
});
