import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Check,
  Cookie,
  Droplets,
  Dumbbell,
  Moon,
  Plus,
  Sun,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import EvolucaoWaterVesselIcon from '@/components/evolucao/EvolucaoWaterVesselIcon';
import AppleBottomSheet, { useBottomSheetDismiss } from '@/components/ui/AppleBottomSheet';
import { usePatientGoals } from '@/hooks/usePatientGoals';
import { loadWaterVesselSettings, type WaterVesselSettings } from '@/lib/water-vessel-settings';
import { colors, fonts } from '@/theme/tokens';

type Props = {
  open: boolean;
  goalId: string;
  onClose: () => void;
};

const GOAL_FALLBACKS: Record<string, { id: string; label: string; target: number }> = {
  water: { id: 'water', label: 'Água', target: 2 },
  food: { id: 'food', label: 'Refeição livre', target: 7 },
  exercise: { id: 'exercise', label: 'Exercício', target: 3 },
  sleep: { id: 'sleep', label: 'Sono', target: 8 },
};

const GOAL_ICONS: Record<string, LucideIcon> = {
  water: Droplets,
  food: Cookie,
  exercise: Dumbbell,
  sleep: Moon,
};

const SHEET_THEMES: Record<string, { accent: string; soft: string }> = {
  water: { accent: '#4a8fc4', soft: '#edf5fb' },
  food: { accent: '#9d7268', soft: '#f8f1ef' },
  exercise: { accent: '#5f8f58', soft: '#eff5ed' },
  sleep: { accent: '#6b74b8', soft: '#f0f1f8' },
};

const SUBTITLES: Record<string, string> = {
  water: 'O que você acabou de beber?',
  food: 'Registre o dia com um único toque.',
  exercise: 'Adicione o treino desta semana.',
  sleep: 'Confirme os horários já configurados.',
};

function formatLiters(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function formatClock(value: number) {
  const total = ((Math.round(Number(value) || 0) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function formatDuration(value: number) {
  const total = Math.max(0, Math.round(Number(value) || 0));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes ? `${hours}h${String(minutes).padStart(2, '0')}` : `${hours}h`;
}

export default function HomeGoalQuickAddSheet({ open, goalId, onClose }: Props) {
  if (!goalId) return null;

  return (
    <AppleBottomSheet visible={open} onClose={onClose}>
      <HomeGoalQuickAddContent goalId={goalId} />
    </AppleBottomSheet>
  );
}

function HomeGoalQuickAddContent({ goalId }: { goalId: string }) {
  const { dismiss } = useBottomSheetDismiss();
  const {
    todaySummary,
    sleepSchedule,
    incrementGoal,
    setSleepSchedule,
    getFoodSelectedDays,
    toggleFoodDay,
    weekdayIndex,
  } = usePatientGoals();

  const [waterSettings, setWaterSettings] = useState<WaterVesselSettings>({ glassMl: 250, bottleMl: 500 });

  useEffect(() => {
    void loadWaterVesselSettings().then(setWaterSettings);
  }, []);

  const activeSummary = useMemo(
    () => todaySummary.find((item) => item.goal.id === goalId),
    [goalId, todaySummary],
  );

  const activeGoal = activeSummary?.goal || GOAL_FALLBACKS[goalId] || { id: goalId, label: 'Meta', target: 1 };
  const theme = SHEET_THEMES[goalId] || { accent: '#6f7863', soft: '#f1f3ef' };
  const ActiveIcon = GOAL_ICONS[goalId] || Droplets;
  const goalComplete = Number(activeSummary?.percent || 0) >= 100;
  const foodTodaySelected = getFoodSelectedDays().includes(weekdayIndex());

  const currentStatus = useMemo(() => {
    if (!activeSummary) return 'Sem registro';
    if (goalId === 'water') {
      return `${formatLiters(activeSummary.progress)} de ${formatLiters(activeSummary.goal.target)} L`;
    }
    if (goalId === 'food') {
      const days = Number(activeSummary.progress || 0);
      return `${days} ${days === 1 ? 'dia' : 'dias'} nesta semana`;
    }
    if (goalId === 'exercise') {
      return `${activeSummary.progress} de ${activeSummary.goal.target} treinos`;
    }
    return `${formatDuration(sleepSchedule.durationMinutes)} de sono`;
  }, [activeSummary, goalId, sleepSchedule.durationMinutes]);

  const waterOptions = [
    { kind: 'glass' as const, label: 'Copo', ml: waterSettings.glassMl },
    { kind: 'bottle' as const, label: 'Garrafa', ml: waterSettings.bottleMl },
  ];

  async function addWater(ml: number) {
    if (goalComplete) return;
    await incrementGoal('water', ml / 1000);
    dismiss();
  }

  async function registerFood() {
    if (!foodTodaySelected) await toggleFoodDay(weekdayIndex());
    dismiss();
  }

  async function registerExercise() {
    if (!goalComplete) await incrementGoal('exercise', 1);
    dismiss();
  }

  async function registerSleep() {
    await setSleepSchedule(sleepSchedule.bedMinutes, sleepSchedule.wakeMinutes, { notify: true });
    dismiss();
  }

  return (
    <>
      <View style={styles.head}>
        <View style={[styles.headIcon, { backgroundColor: theme.soft }]}>
          <ActiveIcon color={theme.accent} size={16} strokeWidth={1.8} />
        </View>
        <View style={styles.headCopy}>
          <Text style={styles.headTitle}>{activeGoal.label}</Text>
          <Text style={styles.headSub}>{SUBTITLES[goalId] || 'Registre seu progresso.'}</Text>
        </View>
        <Pressable
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={dismiss}
        >
          <X color="#5f5f65" size={16} strokeWidth={1.8} />
        </Pressable>
      </View>

      <View style={styles.status}>
        <Text style={styles.statusLabel}>Hoje</Text>
        <Text style={[styles.statusValue, { color: theme.accent }]}>{currentStatus}</Text>
      </View>

      {goalId === 'water' ? (
        <View style={styles.waterOptions}>
          {waterOptions.map((option) => (
            <Pressable
              key={option.kind}
              style={({ pressed }) => [
                styles.waterOption,
                goalComplete && styles.waterOptionDisabled,
                pressed && !goalComplete && { backgroundColor: theme.soft },
              ]}
              disabled={goalComplete}
              onPress={() => void addWater(option.ml)}
            >
              <View style={styles.vesselWrap}>
                <EvolucaoWaterVesselIcon kind={option.kind} fillPercent={70} width={32} height={54} />
              </View>
              <View style={styles.waterOptionCopy}>
                <Text style={styles.waterOptionTitle}>{option.label}</Text>
                <Text style={styles.waterOptionSub}>+ {option.ml} ml</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {goalId === 'food' ? (
        <Pressable
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: foodTodaySelected ? '#e5e5ea' : theme.accent },
            pressed && !foodTodaySelected && styles.primaryPressed,
          ]}
          disabled={foodTodaySelected}
          onPress={() => void registerFood()}
        >
          {foodTodaySelected ? (
            <Check color="#6e6e73" size={14} strokeWidth={2} />
          ) : (
            <Plus color="#fff" size={14} strokeWidth={2} />
          )}
          <Text style={[styles.primaryText, foodTodaySelected && styles.primaryTextDisabled]}>
            {foodTodaySelected ? 'Hoje já foi registrado' : 'Registrar refeição livre hoje'}
          </Text>
        </Pressable>
      ) : null}

      {goalId === 'exercise' ? (
        <Pressable
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: goalComplete ? '#e5e5ea' : theme.accent },
            pressed && !goalComplete && styles.primaryPressed,
          ]}
          disabled={goalComplete}
          onPress={() => void registerExercise()}
        >
          <Plus color={goalComplete ? '#6e6e73' : '#fff'} size={14} strokeWidth={2} />
          <Text style={[styles.primaryText, goalComplete && styles.primaryTextDisabled]}>
            {goalComplete ? 'Meta semanal concluída' : 'Registrar 1 treino'}
          </Text>
        </Pressable>
      ) : null}

      {goalId === 'sleep' ? (
        <View style={styles.sleepBlock}>
          <View style={styles.sleepTimes}>
            <View style={styles.sleepCell}>
              <View style={styles.sleepIconCol}>
                <Moon color={theme.accent} size={16} strokeWidth={1.8} />
              </View>
              <View style={styles.sleepTextCol}>
                <Text style={styles.sleepLabel}>Dormir</Text>
                <Text style={styles.sleepValue}>{formatClock(sleepSchedule.bedMinutes)}</Text>
              </View>
            </View>
            <View style={[styles.sleepCell, styles.sleepCellBorder]}>
              <View style={styles.sleepIconCol}>
                <Sun color={theme.accent} size={16} strokeWidth={1.8} />
              </View>
              <View style={styles.sleepTextCol}>
                <Text style={styles.sleepLabel}>Acordar</Text>
                <Text style={styles.sleepValue}>{formatClock(sleepSchedule.wakeMinutes)}</Text>
              </View>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent }, pressed && styles.primaryPressed]}
            onPress={() => void registerSleep()}
          >
            <Check color="#fff" size={14} strokeWidth={2} />
            <Text style={styles.primaryText}>
              Registrar {formatDuration(sleepSchedule.durationMinutes)} de sono
            </Text>
          </Pressable>
        </View>
      ) : null}

      {goalComplete && goalId === 'water' ? (
        <View style={styles.completeRow}>
          <Check color="#4a8fc4" size={14} strokeWidth={2} />
          <Text style={styles.completeText}>Meta de hidratação concluída hoje</Text>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headCopy: { flex: 1, minWidth: 0 },
  headTitle: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.24,
    color: '#202124',
  },
  headSub: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    color: '#6e6e73',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2f2f4',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  status: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 16,
    marginTop: 16,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ececf0',
  },
  statusLabel: { fontFamily: fonts.regular, fontSize: 11, color: '#6e6e73' },
  statusValue: { fontFamily: fonts.medium, fontSize: 14, fontVariant: ['tabular-nums'] },
  waterOptions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  waterOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 80,
    padding: 11,
    borderWidth: 1,
    borderColor: '#dce7ef',
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  waterOptionDisabled: { opacity: 0.48 },
  vesselWrap: { width: 32, height: 54, flexShrink: 0 },
  waterOptionCopy: { flex: 1, minWidth: 0 },
  waterOptionTitle: { fontFamily: fonts.medium, fontSize: 13, color: '#202124' },
  waterOptionSub: { marginTop: 4, fontFamily: fonts.regular, fontSize: 10, color: '#6e6e73' },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 46,
    marginTop: 4,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  primaryPressed: { opacity: 0.88 },
  primaryText: { fontFamily: fonts.medium, fontSize: 12, color: '#fff' },
  primaryTextDisabled: { color: '#6e6e73' },
  sleepBlock: { marginTop: 4 },
  sleepTimes: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  sleepCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 12,
  },
  sleepIconCol: { width: 24, alignItems: 'center' },
  sleepTextCol: { flex: 1, minWidth: 0, gap: 2 },
  sleepCellBorder: { borderLeftWidth: 1, borderLeftColor: '#e5e5ea' },
  sleepLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#6e6e73',
  },
  sleepValue: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  completeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  completeText: { fontFamily: fonts.regular, fontSize: 11, color: '#4a8fc4' },
});
