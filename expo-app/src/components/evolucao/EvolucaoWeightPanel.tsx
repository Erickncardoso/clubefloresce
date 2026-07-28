import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import WeightRulerPicker from '@/components/evolucao/WeightRulerPicker';
import { useAppToast } from '@/hooks/useAppToast';
import { usePatientApi } from '@/hooks/usePatientApi';
import { toastSaveError, toastSuccess } from '@/lib/app-toast';
import { formatPatientDateLabel } from '@/lib/local-date';
import { colors, fonts, radii } from '@/theme/tokens';

type WeightEntry = {
  id?: string;
  weightKg: number;
  weekStart?: string;
  createdAt?: string;
  updatedAt?: string;
  delta?: number | null;
};

function formatWeight(value: number) {
  return Number(value).toFixed(1).replace('.0', '');
}

export default function EvolucaoWeightPanel() {
  const { request } = usePatientApi();
  const { showToast } = useAppToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [weightValue, setWeightValue] = useState<number | null>(null);
  const [entries, setEntries] = useState<WeightEntry[]>([]);

  const latestEntry = entries[0] || null;

  const loadHistory = useCallback(async ({ silent = false } = {}) => {
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
        .sort((a, b) => {
          const aTime = new Date(a.updatedAt || a.createdAt || a.weekStart || 0).getTime();
          const bTime = new Date(b.updatedAt || b.createdAt || b.weekStart || 0).getTime();
          return bTime - aTime;
        })
        .slice(0, 12);

      const withDelta = sorted.map((row, index) => {
        const prev = sorted[index + 1];
        const delta = prev?.weightKg != null ? row.weightKg - prev.weightKg : null;
        return { ...row, delta };
      });

      setEntries(withDelta);
      const latest = sorted[0]?.weightKg;
      setWeightValue(latest ?? null);
    } catch {
      setEntries([]);
      setWeightValue(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

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
      showToast(toastSuccess('Peso salvo', `${formatWeight(weight)} kg`));
    } catch (err) {
      const message = (err as Error).message || 'Não foi possível salvar o peso.';
      setFormError(message);
      showToast(toastSaveError(message));
    } finally {
      setSaving(false);
    }
  }

  const deltaStyle = useMemo(() => {
    if (latestEntry?.delta == null) return null;
    if (latestEntry.delta < 0) return styles.deltaDown;
    if (latestEntry.delta > 0) return styles.deltaUp;
    return null;
  }, [latestEntry?.delta]);

  return (
    <View style={styles.root}>
      {!loading && latestEntry ? (
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>PESO ATUAL</Text>
          <View style={styles.heroValueRow}>
            <Text style={styles.heroValue}>{formatWeight(latestEntry.weightKg)}</Text>
            <Text style={styles.heroUnit}>kg</Text>
          </View>
          {latestEntry.delta != null ? (
            <Text style={[styles.heroDelta, deltaStyle]}>
              {latestEntry.delta > 0 ? '+' : ''}
              {latestEntry.delta.toFixed(1)} kg vs. último registro
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Registrar peso</Text>
        <Text style={styles.hint}>Deslize a régua até o peso de hoje.</Text>
        {!loading ? (
          <WeightRulerPicker value={weightValue} onChange={setWeightValue} />
        ) : (
          <ActivityIndicator color={colors.primaryDark} style={{ marginVertical: 24 }} />
        )}
        <Pressable
          style={[styles.saveBtn, (saving || weightValue == null) && styles.saveBtnDisabled]}
          disabled={saving || weightValue == null}
          onPress={saveWeight}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Salvando…' : 'Salvar peso'}</Text>
        </Pressable>
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Carregando histórico…</Text>
      ) : null}

      {!loading && !entries.length ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>
            Seus registros de peso aparecem aqui após o check-in semanal.
          </Text>
        </View>
      ) : null}

      {!loading && entries.length ? (
        <View style={styles.history}>
          <Text style={styles.cardTitle}>Histórico</Text>
          <View style={styles.list}>
            {entries.map((entry) => (
              <View key={entry.id || entry.weekStart} style={styles.listItem}>
                <View>
                  <Text style={styles.listWeight}>{formatWeight(entry.weightKg)} kg</Text>
                  <Text style={styles.listDate}>
                    {formatPatientDateLabel(entry.updatedAt || entry.createdAt || entry.weekStart)}
                  </Text>
                </View>
                {entry.delta != null ? (
                  <Text
                    style={[
                      styles.listDelta,
                      entry.delta < 0 && styles.listDeltaDown,
                      entry.delta > 0 && styles.listDeltaUp,
                    ]}
                  >
                    {entry.delta > 0 ? '+' : ''}
                    {entry.delta.toFixed(1)}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Medidas corporais</Text>
        <Text style={styles.hint}>
          Em breve você poderá registrar cintura, quadril e outras medidas com a nutri.
        </Text>
      </View>
    </View>
  );
}

const CARD_RADIUS = 22;

const styles = StyleSheet.create({
  root: { gap: 12 },
  hero: {
    padding: 17,
    borderRadius: CARD_RADIUS,
    backgroundColor: colors.surface,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  heroLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  heroValue: {
    fontFamily: fonts.extrabold,
    fontSize: 32,
    color: colors.text,
  },
  heroUnit: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.textMuted,
  },
  heroDelta: {
    marginTop: 6,
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
  },
  deltaDown: { color: colors.primaryDark },
  deltaUp: { color: '#c4842e' },
  card: {
    padding: 17,
    borderRadius: CARD_RADIUS,
    backgroundColor: colors.surface,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    gap: 8,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  saveBtn: {
    marginTop: 8,
    backgroundColor: colors.primaryDark,
    borderRadius: radii.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#fff',
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.error,
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
  history: { gap: 8 },
  list: {
    borderRadius: CARD_RADIUS,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(28, 24, 22, 0.06)',
  },
  listWeight: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  listDate: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  listDelta: {
    minWidth: 40,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: '#f3f3f3',
    fontFamily: fonts.bold,
    fontSize: 12,
    textAlign: 'center',
    color: colors.textMuted,
  },
  listDeltaDown: {
    backgroundColor: '#eef5eb',
    color: colors.primaryDark,
  },
  listDeltaUp: {
    backgroundColor: '#fdf4e8',
    color: '#c4842e',
  },
});
