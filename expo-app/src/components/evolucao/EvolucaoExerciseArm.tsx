import { Minus, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii } from '@/theme/tokens';

type ExerciseArmProps = {
  current: number;
  target: number;
  onIncrement: () => void;
  onDecrement: () => void;
};

export default function EvolucaoExerciseArm({
  current,
  target,
  onIncrement,
  onDecrement,
}: ExerciseArmProps) {
  const fillPercent = target ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const segments = Array.from({ length: Math.max(1, target) }, (_, index) => {
    const sessionIndex = index + 1;
    return {
      done: sessionIndex <= current,
      active: sessionIndex === current + 1,
    };
  });

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
                segment.active && styles.segmentActive,
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
    backgroundColor: '#e5e7e2',
  },
  segmentDone: { backgroundColor: colors.primaryDark },
  segmentActive: { backgroundColor: '#a8b39a' },
  status: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  btnGhost: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryDark,
    borderRadius: radii.pill,
    paddingVertical: 12,
  },
  btnPrimaryText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#fff',
  },
});
