import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Plus, Scale } from 'lucide-react-native';
import WeightProgressChart from '@/components/evolucao/WeightProgressChart';
import WeightRegisterSheet from '@/components/evolucao/WeightRegisterSheet';
import { useAppToast } from '@/hooks/useAppToast';
import { usePatientApi } from '@/hooks/usePatientApi';
import { toastSaveError, toastSuccess } from '@/lib/app-toast';
import {
  buildDaySeries,
  buildMonthSeries,
  entryDate,
  formatWeightDisplay,
  formatWeightHistoryDate,
} from '@/lib/weight-progress';
import { triggerImpactHaptic } from '@/lib/picker-haptics';
import { colors, fonts, radii } from '@/theme/tokens';

type WeightEntry = {
  id?: string;
  weightKg: number;
  weekStart?: string;
  createdAt?: string;
  updatedAt?: string;
  delta?: number | null;
};

type ChartMode = 'days' | 'months';

export default function EvolucaoWeightPanel() {
  const { request } = usePatientApi();
  const { showToast } = useAppToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [weightValue, setWeightValue] = useState<number | null>(null);
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [chartMode, setChartMode] = useState<ChartMode>('days');
  const [profile, setProfile] = useState<{ weightKg: number | null; targetWeightKg: number | null }>({
    weightKg: null,
    targetWeightKg: null,
  });
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const latestEntry = entries[0] || null;
  const targetWeight = profile.targetWeightKg;

  const startWeight = useMemo(() => {
    if (profile.weightKg != null) return profile.weightKg;
    if (!entries.length) return latestEntry?.weightKg ?? null;
    const oldest = [...entries].sort(
      (a, b) => entryDate(a).getTime() - entryDate(b).getTime(),
    )[0];
    return oldest?.weightKg ?? null;
  }, [entries, latestEntry?.weightKg, profile.weightKg]);

  const loadProfile = useCallback(async () => {
    try {
      const data = await request<{
        profile?: { weightKg?: number | null; targetWeightKg?: number | null };
      }>('/patient-profile/me');
      const next = {
        weightKg: data?.profile?.weightKg ?? null,
        targetWeightKg: data?.profile?.targetWeightKg ?? null,
      };
      setProfile(next);
      return next;
    } catch {
      const empty = { weightKg: null, targetWeightKg: null };
      setProfile(empty);
      return empty;
    }
  }, [request]);

  const chartPoints = useMemo(
    () => (chartMode === 'days' ? buildDaySeries(entries) : buildMonthSeries(entries)),
    [chartMode, entries],
  );

  const loadHistory = useCallback(async ({
    silent = false,
    profileWeights = profileRef.current,
  }: {
    silent?: boolean;
    profileWeights?: { weightKg: number | null; targetWeightKg: number | null };
  } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await request<{
        current?: WeightEntry;
        history?: WeightEntry[];
      }>('/checkin/me');

      const seen = new Set<string>();
      const rows: WeightEntry[] = [];

      const pushRow = (item?: WeightEntry) => {
        if (item?.weightKg == null) return;
        const key = item.id || String(item.weekStart);
        if (seen.has(key)) return;
        seen.add(key);
        rows.push(item);
      };

      if (data.current) pushRow(data.current);
      for (const item of data.history || []) pushRow(item);

      const sorted = rows
        .sort((a, b) => entryDate(b).getTime() - entryDate(a).getTime())
        .slice(0, 12);

      const withDelta = sorted.map((row, index) => {
        const prev = sorted[index + 1];
        const delta = prev?.weightKg != null ? row.weightKg - prev.weightKg : null;
        return { ...row, delta };
      });

      setEntries(withDelta);
      setWeightValue(sorted[0]?.weightKg ?? profileWeights.weightKg ?? null);
    } catch {
      setEntries([]);
      setWeightValue(profileWeights.weightKg ?? null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void (async () => {
      const profileWeights = await loadProfile();
      await loadHistory({ profileWeights });
    })();
  }, [loadHistory, loadProfile]);

  async function saveWeight() {
    setFormError('');
    const weight = Number(weightValue);
    if (!Number.isFinite(weight) || weight <= 0) {
      const message = 'Informe um peso válido.';
      setFormError(message);
      showToast(toastSaveError(message));
      return;
    }

    setSaving(true);
    try {
      const current = await request<{
        current?: { mood?: number; energy?: number; adherence?: number; notes?: string };
      }>('/checkin/me');

      await request('/checkin', {
        method: 'POST',
        body: JSON.stringify({
          mood: current.current?.mood || 3,
          energy: current.current?.energy || 3,
          adherence: current.current?.adherence ?? 3,
          weightKg: weight,
          notes: current.current?.notes || '',
        }),
      });

      await loadHistory({ silent: true });
      setSheetOpen(false);
      showToast(toastSuccess('Peso salvo', `${formatWeightDisplay(weight)} kg`));
    } catch (err) {
      const message = (err as Error).message || 'Não foi possível salvar o peso.';
      setFormError(message);
      showToast(toastSaveError(message));
    } finally {
      setSaving(false);
    }
  }

  function openRegister() {
    triggerImpactHaptic();
    setFormError('');
    setSheetOpen(true);
  }

  return (
    <View style={styles.root}>
      {!loading && (startWeight != null || targetWeight != null) ? (
        <View style={styles.goalPill}>
          <View style={styles.goalSide}>
            <Text style={styles.goalLabel}>Início</Text>
            <Text style={styles.goalValue}>
              {startWeight != null ? `${formatWeightDisplay(startWeight)} kg` : '—'}
            </Text>
          </View>
          <ArrowRight color="rgba(255,255,255,0.55)" size={16} strokeWidth={2} />
          <View style={styles.goalSide}>
            <Text style={styles.goalLabel}>Meta</Text>
            <Text style={[styles.goalValue, styles.goalValueTarget]}>
              {targetWeight != null ? `${formatWeightDisplay(targetWeight)} kg` : '—'}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.chartTitle}>Progresso do peso (kg)</Text>
        <View style={styles.segment}>
          {([
            { id: 'days' as const, label: 'Dias' },
            { id: 'months' as const, label: 'Meses' },
          ]).map(({ id, label }) => {
            const active = chartMode === id;
            return (
              <Pressable
                key={id}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                onPress={() => setChartMode(id)}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        {loading ? (
          <ActivityIndicator color={colors.primaryDark} style={{ marginVertical: 36 }} />
        ) : (
          <WeightProgressChart points={chartPoints} goalKg={targetWeight} />
        )}
      </View>

      <View style={styles.historyBlock}>
        <Text style={styles.historyTitle}>Histórico</Text>
        {loading ? (
          <Text style={styles.loadingText}>Carregando histórico…</Text>
        ) : !entries.length ? (
          <Text style={styles.emptyText}>
            Seus registros de peso aparecem aqui após o check-in semanal.
          </Text>
        ) : (
          <>
            <View style={styles.historyHead}>
              <Text style={styles.historyCol}>Peso</Text>
              <Text style={[styles.historyCol, styles.historyColCenter]}>Alterar</Text>
              <Text style={[styles.historyCol, styles.historyColRight]}>Data</Text>
            </View>
            <View style={styles.list}>
              {entries.map((entry) => (
                <View key={entry.id || entry.weekStart} style={styles.listItem}>
                  <View style={styles.listMain}>
                    <View style={styles.listIcon}>
                      <Scale color="#8a8a8e" size={16} strokeWidth={1.8} />
                    </View>
                    <Text style={styles.listWeight}>{formatWeightDisplay(entry.weightKg)} kg</Text>
                  </View>
                  <Text
                    style={[
                      styles.listDelta,
                      entry.delta != null && entry.delta < 0 && styles.listDeltaDown,
                      entry.delta != null && entry.delta > 0 && styles.listDeltaUp,
                    ]}
                  >
                    {entry.delta == null
                      ? '—'
                      : `${entry.delta > 0 ? '+' : ''}${entry.delta.toFixed(1)}`}
                  </Text>
                  <Text style={styles.listDate}>
                    {formatWeightHistoryDate(entry.updatedAt || entry.createdAt || entry.weekStart)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [styles.registerBtn, pressed && styles.registerBtnPressed]}
        onPress={openRegister}
      >
        <Plus color="#fff" size={18} strokeWidth={2.4} />
        <Text style={styles.registerBtnText}>Registrar peso</Text>
      </Pressable>

      <WeightRegisterSheet
        open={sheetOpen}
        saving={saving}
        error={formError}
        value={weightValue}
        loading={loading}
        onClose={() => {
          setSheetOpen(false);
          setFormError('');
        }}
        onChange={setWeightValue}
        onSave={() => void saveWeight()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14, paddingBottom: 8 },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryDark,
  },
  goalSide: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  goalLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
  },
  goalValue: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },
  goalValueTarget: {
    color: '#fff',
  },
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ececee',
    backgroundColor: '#fff',
    gap: 12,
  },
  chartTitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: '#8a8a8e',
  },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    backgroundColor: '#f2f2f4',
  },
  segmentBtn: {
    flex: 1,
    minHeight: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#8a8a8e',
  },
  segmentTextActive: {
    color: colors.text,
  },
  historyBlock: { gap: 10 },
  historyTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: -0.4,
    color: colors.text,
  },
  historyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  historyCol: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#b0b0b4',
  },
  historyColCenter: { textAlign: 'center' },
  historyColRight: { textAlign: 'right' },
  list: {
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ececee',
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ececee',
  },
  listMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  listIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f2f2f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listWeight: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  listDelta: {
    width: 56,
    fontFamily: fonts.semibold,
    fontSize: 13,
    textAlign: 'center',
    color: '#8a8a8e',
  },
  listDeltaDown: { color: colors.primaryDark },
  listDeltaUp: { color: '#c4842e' },
  listDate: {
    width: 72,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#8a8a8e',
    textAlign: 'right',
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryDark,
  },
  registerBtnPressed: { opacity: 0.88 },
  registerBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#fff',
  },
  loadingText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
