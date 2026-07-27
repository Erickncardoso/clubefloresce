import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Cookie,
  Droplets,
  Dumbbell,
  Minus,
  Moon,
  Plus,
  Sparkles,
} from 'lucide-react-native';
import EvolucaoExerciseArm from '@/components/evolucao/EvolucaoExerciseArm';
import EvolucaoFoodPlate from '@/components/evolucao/EvolucaoFoodPlate';
import EvolucaoSleepChart from '@/components/evolucao/EvolucaoSleepChart';
import EvolucaoWaterBottle from '@/components/evolucao/EvolucaoWaterBottle';
import { usePatientGoals, type PatientGoal } from '@/hooks/usePatientGoals';
import { colors, fonts, radii } from '@/theme/tokens';

function goalIcon(goal: PatientGoal) {
  if (goal.type === 'water') return Droplets;
  if (goal.id === 'food') return Cookie;
  if (goal.id === 'exercise') return Dumbbell;
  if (goal.id === 'sleep') return Moon;
  return Sparkles;
}

function frequencyLabel(frequency: PatientGoal['frequency']) {
  return frequency === 'weekly' ? 'Semanal' : 'Diária';
}

const CARD_BG: Record<string, string> = {
  water: '#e8f0fb',
  food: '#f8f0ed',
  exercise: '#eef0eb',
  sleep: '#f3f4f6',
};

const ICON_COLOR: Record<string, string> = {
  water: '#4a8fc4',
  food: '#9d7268',
  exercise: '#5f8f58',
  sleep: '#6b74b8',
};

export default function EvolucaoGoalsPanel() {
  const {
    todaySummary,
    sleepSchedule,
    incrementGoal,
    decrementGoal,
    getFoodSelectedDays,
    toggleFoodDay,
    shiftSleepTime,
    updateGoal,
    addGoal,
    weekdayIndex,
  } = usePatientGoals();

  const [showAdd, setShowAdd] = useState(false);
  const [editingGoal, setEditingGoal] = useState<PatientGoal | null>(null);
  const [form, setForm] = useState({
    label: '',
    target: '1',
    unit: '',
    frequency: 'daily' as 'daily' | 'weekly',
  });

  function openEdit(goal: PatientGoal) {
    setEditingGoal(goal);
    setForm({
      label: goal.label,
      target: String(goal.target),
      unit: goal.unit,
      frequency: goal.frequency,
    });
    setShowAdd(false);
  }

  function closeModal() {
    setShowAdd(false);
    setEditingGoal(null);
  }

  async function saveForm() {
    const payload = {
      label: form.label.trim() || 'Meta',
      target: Math.max(1, Math.min(99, Number(form.target) || 1)),
      unit: form.unit.trim() || 'vezes',
      frequency: form.frequency === 'weekly' ? 'weekly' as const : 'daily' as const,
    };

    if (showAdd) {
      await addGoal({ ...payload, type: 'habit', color: '#8B967C' });
    } else if (editingGoal) {
      await updateGoal(editingGoal.id, payload);
    }
    closeModal();
  }

  return (
    <View style={styles.root}>
      {todaySummary.map((item) => {
        const Icon = goalIcon(item.goal);
        const cardBg = CARD_BG[item.goal.id] || '#f3f4f6';
        const iconColor = ICON_COLOR[item.goal.id] || colors.text;

        return (
          <View key={item.goal.id} style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.head}>
              <View style={styles.headCopy}>
                <View style={styles.iconWrap}>
                  <Icon size={16} color={iconColor} />
                </View>
                <View style={styles.headText}>
                  <Text style={styles.goalTitle}>{item.goal.label}</Text>
                  <Text style={styles.goalMeta}>
                    {item.goal.id === 'food'
                      ? `Semanal · ${item.progress} ${item.progress === 1 ? 'dia registrado' : 'dias registrados'}`
                      : `${frequencyLabel(item.goal.frequency)} · ${item.progress} / ${item.goal.target} ${item.goal.unit}`}
                  </Text>
                </View>
              </View>
              {item.goal.id === 'food' ? (
                <Text style={styles.pctCount}>{item.progress}</Text>
              ) : (
                <Text style={styles.pct}>{item.percent}%</Text>
              )}
            </View>

            <View style={styles.surface}>
              {item.goal.type === 'water' ? (
                <EvolucaoWaterBottle
                  current={item.progress}
                  target={item.goal.target}
                  onIncrement={() => incrementGoal(item.goal.id)}
                  onDecrement={() => decrementGoal(item.goal.id)}
                />
              ) : null}

              {item.goal.id === 'food' ? (
                <EvolucaoFoodPlate
                  selectedDays={getFoodSelectedDays()}
                  todayIndex={weekdayIndex()}
                  onToggleDay={(day) => toggleFoodDay(day)}
                />
              ) : null}

              {item.goal.id === 'exercise' ? (
                <EvolucaoExerciseArm
                  current={item.progress}
                  target={item.goal.target}
                  onIncrement={() => incrementGoal(item.goal.id)}
                  onDecrement={() => decrementGoal(item.goal.id)}
                />
              ) : null}

              {item.goal.id === 'sleep' ? (
                <EvolucaoSleepChart
                  target={item.goal.target}
                  schedule={sleepSchedule}
                  onShiftBed={(delta) => shiftSleepTime('bed', delta)}
                  onShiftWake={(delta) => shiftSleepTime('wake', delta)}
                />
              ) : null}

              {item.goal.type !== 'water'
                && item.goal.id !== 'food'
                && item.goal.id !== 'exercise'
                && item.goal.id !== 'sleep' ? (
                  <View style={styles.genericActions}>
                    <Pressable style={styles.genericBtn} onPress={() => decrementGoal(item.goal.id)}>
                      <Minus size={16} color={colors.textMuted} />
                    </Pressable>
                    <Text style={styles.genericValue}>
                      {item.progress} / {item.goal.target}
                    </Text>
                    <Pressable
                      style={[styles.genericBtn, styles.genericBtnPrimary]}
                      onPress={() => incrementGoal(item.goal.id)}
                    >
                      <Plus size={16} color="#fff" />
                    </Pressable>
                  </View>
                ) : null}
            </View>

            {item.goal.id !== 'food' ? (
              <Pressable style={styles.editBtn} onPress={() => openEdit(item.goal)}>
                <Text style={styles.editBtnText}>Ajustar meta</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}

      <Pressable style={styles.addGoal} onPress={() => {
        setShowAdd(true);
        setEditingGoal(null);
        setForm({ label: '', target: '1', unit: '', frequency: 'daily' });
      }}
      >
        <Text style={styles.addGoalText}>+ Nova meta</Text>
      </Pressable>

      <Modal visible={showAdd || !!editingGoal} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={closeModal}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{showAdd ? 'Nova meta' : 'Ajustar meta'}</Text>

            <Text style={styles.fieldLabel}>Nome</Text>
            <TextInput
              style={styles.input}
              value={form.label}
              onChangeText={(label) => setForm((prev) => ({ ...prev, label }))}
              maxLength={40}
            />

            <Text style={styles.fieldLabel}>Meta</Text>
            <TextInput
              style={styles.input}
              value={form.target}
              onChangeText={(target) => setForm((prev) => ({ ...prev, target }))}
              keyboardType="number-pad"
            />

            <Text style={styles.fieldLabel}>Unidade</Text>
            <TextInput
              style={styles.input}
              value={form.unit}
              onChangeText={(unit) => setForm((prev) => ({ ...prev, unit }))}
              maxLength={20}
            />

            <View style={styles.freqRow}>
              {(['daily', 'weekly'] as const).map((freq) => (
                <Pressable
                  key={freq}
                  style={[styles.freqChip, form.frequency === freq && styles.freqChipActive]}
                  onPress={() => setForm((prev) => ({ ...prev, frequency: freq }))}
                >
                  <Text style={[styles.freqChipText, form.frequency === freq && styles.freqChipTextActive]}>
                    {freq === 'daily' ? 'Diária' : 'Semanal'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={closeModal}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.modalSave} onPress={saveForm}>
                <Text style={styles.modalSaveText}>Salvar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  card: {
    borderRadius: 22,
    paddingTop: 16,
    paddingHorizontal: 17,
    paddingBottom: 15,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headCopy: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: { flex: 1 },
  goalTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  goalMeta: {
    marginTop: 3,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(28, 24, 22, 0.52)',
  },
  pct: {
    fontFamily: fonts.extrabold,
    fontSize: 25,
    color: colors.text,
  },
  pctCount: {
    fontFamily: fonts.extrabold,
    fontSize: 25,
    color: colors.text,
  },
  surface: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.82)',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  genericActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  genericBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genericBtnPrimary: { backgroundColor: colors.primaryDark },
  genericValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
    minWidth: 72,
    textAlign: 'center',
  },
  editBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  editBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.primaryDark,
  },
  addGoal: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: colors.surface,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    alignItems: 'center',
  },
  addGoalText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.primaryDark,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    marginBottom: 14,
    color: colors.text,
  },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e8ece9',
    borderRadius: radii.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    marginBottom: 12,
    color: colors.text,
  },
  freqRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  freqChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: '#e8ece9',
    alignItems: 'center',
  },
  freqChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  freqChipText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  freqChipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: '#e8ece9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  modalSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
  },
  modalSaveText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#fff',
  },
});
