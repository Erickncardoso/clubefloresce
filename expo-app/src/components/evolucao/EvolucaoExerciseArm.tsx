import { Minus, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii } from '@/theme/tokens';

type ExerciseArmProps = {
  current: number;
  target: number;
  onIncrement: () => void;
  onDecrement: () => void;
  compact?: boolean;
  onOpenEditor?: () => void;
};

export default function EvolucaoExerciseArm({
  current,
  target,
  onIncrement,
  onDecrement,
  compact = false,
  onOpenEditor,
}: ExerciseArmProps) {
  const fillPercent = target ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const segments = Array.from({ length: Math.max(1, target) }, (_, index) => ({
    done: index + 1 <= current,
  }));

  if (compact) {
    return (
      <View style={styles.compactRoot}>
        <View style={styles.compactSummary}>
          <View style={styles.compactCopy}>
            <Text style={styles.compactLabel}>Progresso semanal</Text>
            <Text style={styles.compactValue}>
              {current}
              <Text style={styles.compactValueSub}> de {target} treinos</Text>
            </Text>
          </View>
          <View style={[styles.compactSegments, { flex: 1, maxWidth: 160 }]}>
            {segments.map((segment, index) => (
              <View
                key={index}
                style={[styles.compactSegment, segment.done && styles.compactSegmentDone]}
              />
            ))}
          </View>
        </View>
        <Pressable style={styles.openBtn} onPress={onOpenEditor}>
          <Plus color="#fff" size={14} strokeWidth={2} />
          <Text style={styles.openBtnText}>
            {current > 0 ? 'Editar treinos' : 'Registrar treino'}
          </Text>
        </Pressable>
      </View>
    );
  }

  let statusMessage = 'Defina sua meta semanal de movimento.';
  if (target) {
    if (current >= target) statusMessage = 'Meta semanal concluída. Excelente consistência!';
    else if (current === 0) statusMessage = 'Comece com um treino leve hoje.';
    else {
      const remaining = target - current;
      statusMessage = remaining === 1
        ? 'Falta 1 treino para fechar a semana.'
        : `Faltam ${remaining} treinos para fechar a semana.`;
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.panel}>
        <View style={styles.topRow}>
          <Text style={styles.label}>Esta semana</Text>
          <Text style={styles.pct}>{fillPercent}%</Text>
        </View>
        <Text style={styles.stat}>
          <Text style={styles.statStrong}>{current}</Text>
          <Text style={styles.statMuted}>
            {' '}/ {target} {target === 1 ? 'treino' : 'treinos'}
          </Text>
        </Text>
        <View style={styles.bar}>
          {segments.map((segment, index) => (
            <View
              key={index}
              style={[
                styles.segment,
                segment.done && styles.segmentDone,
              ]}
            />
          ))}
        </View>
        <Text style={styles.status}>{statusMessage}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.btnGhost, current <= 0 && styles.btnDisabled]}
          disabled={current <= 0}
          onPress={onDecrement}
        >
          <Minus size={16} color={colors.textMuted} />
        </Pressable>
        <Pressable style={styles.btnPrimary} onPress={onIncrement}>
          <Plus size={16} color="#fff" />
          <Text style={styles.btnPrimaryText}>Registrar treino</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  compactRoot: { gap: 12 },
  compactSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    minHeight: 60,
  },
  compactCopy: { flex: 1, minWidth: 0 },
  compactLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#6f786c',
  },
  compactValue: {
    marginTop: 3,
    fontFamily: fonts.medium,
    fontSize: 22,
    lineHeight: 22,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    color: '#466741',
  },
  compactValueSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#466741',
  },
  compactSegments: {
    flexDirection: 'row',
    gap: 5,
  },
  compactSegment: {
    flex: 1,
    height: 28,
    borderWidth: 1,
    borderColor: '#dfe7dd',
    borderRadius: 9,
    backgroundColor: '#f1f5f0',
  },
  compactSegmentDone: {
    borderColor: '#5f8f58',
    backgroundColor: '#5f8f58',
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: 12,
    backgroundColor: '#5f8f58',
    borderWidth: 1,
    borderColor: '#5f8f58',
  },
  openBtnText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#fff',
  },
  root: { gap: 12 },
  panel: { gap: 8 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
  },
  pct: {
    fontFamily: fonts.extrabold,
    fontSize: 14,
    color: colors.primaryDark,
  },
  stat: { fontSize: 14 },
  statStrong: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
    color: colors.text,
  },
  statMuted: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  bar: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  segment: {
    flex: 1,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: '#ececea',
  },
  segmentDone: { backgroundColor: '#5f8f58' },
  status: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  btnGhost: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#5f8f58',
  },
  btnPrimaryText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#fff',
  },
});
