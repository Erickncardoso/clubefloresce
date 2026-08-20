import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react-native';
import type { DailySummary } from '@/hooks/useDietaDiarySync';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = {
  summary: DailySummary | null;
  manageable?: boolean;
  onEditEntry?: (entry: NonNullable<DailySummary['entries']>[number]) => void;
  onDeleteEntry?: (entry: NonNullable<DailySummary['entries']>[number]) => void;
};

/** Espelha `frontend/components/bella/DailyDiaryBar.vue`. */
export default function BellaDailyDiaryBar({
  summary,
  manageable = false,
  onEditEntry,
  onDeleteEntry,
}: Props) {
  const [expanded, setExpanded] = useState(true);

  const caloriePercent = useMemo(() => {
    const target = summary?.targets?.caloriesKcal || 0;
    const consumed = summary?.consumed?.caloriesKcal || 0;
    if (!target) return 0;
    return Math.min(100, Math.round((consumed / target) * 100));
  }, [summary]);

  if (!summary) return null;

  const entries = summary.entries || [];

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.toggle} onPress={() => setExpanded((value) => !value)}>
        <View style={styles.toggleCopy}>
          <Text style={styles.title}>Diário de hoje</Text>
          <Text style={styles.compactCal}>
            {summary.consumed?.caloriesKcal || 0} / {summary.targets?.caloriesKcal || 0} kcal
          </Text>
        </View>
        <ChevronDown
          size={16}
          color={colors.textMuted}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          <View style={styles.row}>
            <Text style={styles.label}>Calorias</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${caloriePercent}%` }]} />
            </View>
            <Text style={styles.value}>
              {summary.consumed?.caloriesKcal || 0} / {summary.targets?.caloriesKcal || 0}
            </Text>
          </View>

          <View style={styles.macros}>
            <Text style={styles.macro}>P {summary.consumed?.proteinG || 0}/{summary.targets?.proteinG || 0} g</Text>
            <Text style={styles.macro}>C {summary.consumed?.carbsG || 0}/{summary.targets?.carbsG || 0} g</Text>
            <Text style={styles.macro}>G {summary.consumed?.fatG || 0}/{summary.targets?.fatG || 0} g</Text>
          </View>

          {manageable && entries.length ? (
            <View style={styles.entries}>
              {entries.map((entry) => (
                <View key={entry.id} style={styles.entry}>
                  <View style={styles.entryCopy}>
                    <Text style={styles.entryLabel} numberOfLines={1}>{entry.mealLabel || 'Refeição'}</Text>
                    <Text style={styles.entryKcal}>{entry.caloriesKcal || 0} kcal</Text>
                  </View>
                  <View style={styles.entryActions}>
                    <Pressable
                      style={styles.entryBtn}
                      hitSlop={8}
                      onPress={() => onEditEntry?.(entry)}
                    >
                      <Pencil size={14} color={colors.textMuted} />
                    </Pressable>
                    <Pressable
                      style={[styles.entryBtn, styles.entryBtnDanger]}
                      hitSlop={8}
                      onPress={() => onDeleteEntry?.(entry)}
                    >
                      <Trash2 size={14} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing[3],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    overflow: 'hidden',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  toggleCopy: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  compactCal: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  body: { paddingHorizontal: spacing[3], paddingBottom: spacing[3] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.text },
  track: {
    flex: 1,
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: '#eef2f1',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.primary },
  value: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  macros: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[2] },
  macro: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  entries: {
    marginTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  entryCopy: { flex: 1, minWidth: 0 },
  entryLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  entryKcal: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  entryActions: { flexDirection: 'row', gap: 4 },
  entryBtn: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: '#f3f4f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryBtnDanger: { backgroundColor: colors.errorSoft },
});
