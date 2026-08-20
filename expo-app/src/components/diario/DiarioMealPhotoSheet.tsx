import { useCallback, useEffect, useMemo, useState } from 'react';
import { InteractionManager, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CircleAlert, CircleCheck } from 'lucide-react-native';
import CameraIcon from '@/components/icons/CameraIcon';
import AppleBottomSheet, { useBottomSheetDismiss } from '@/components/ui/AppleBottomSheet';
import DiaryDatePicker from '@/components/dieta/DiaryDatePicker';
import type { MealPhotoTarget } from '@/components/diario/MealPhotoFlow';
import { useDiaryDate } from '@/hooks/useDiaryDate';
import { usePatientApi } from '@/hooks/usePatientApi';
import { usePatientMealPlan } from '@/hooks/usePatientMealPlan';
import { useMealPlan } from '@/hooks/useMealPlan';
import {
  buildMealPhotoStatuses,
  formatMealTimeLabel,
  pickDefaultMealId,
  type MealPhotoStatusRow,
} from '@/lib/meal-photo-status';
import { getMealIdForTimeFromMeals } from '@/lib/meal-plan-time';
import { formatDiaryDatePillLabel } from '@/lib/diary-date';
import type { DailySummary } from '@/types/daily-summary';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const FALLBACK_MEALS = [
  { id: 'breakfast', label: 'Café da manhã', time: '07:00' },
  { id: 'morning_snack', label: 'Lanche da manhã', time: '10:00' },
  { id: 'lunch', label: 'Almoço', time: '12:00' },
  { id: 'afternoon_snack', label: 'Lanche da tarde', time: '16:00' },
  { id: 'dinner', label: 'Jantar', time: '19:00' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onStartPhoto: (meal: MealPhotoTarget) => void;
};

function statusCopy(row: MealPhotoStatusRow) {
  if (row.status === 'done') return 'Enviado';
  if (row.status === 'pending') return 'Pendente';
  return 'Aguardando';
}

const SHEET_RATIO = 0.68;

export default function DiarioMealPhotoSheet({ open, onClose, onStartPhoto }: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const bodyHeight = Math.round(windowHeight * SHEET_RATIO);
  const snapHeight = bodyHeight + 28;
  const { request } = usePatientApi();
  const { foodDiaryPath, selectedDateKey, isToday } = useDiaryDate();
  const { planRecord } = usePatientMealPlan();
  const { mealList, getMealIdForTime } = useMealPlan(planRecord);

  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [selectedMealId, setSelectedMealId] = useState('');

  const meals = mealList.length ? mealList : FALLBACK_MEALS;

  const statusRows = useMemo(
    () => buildMealPhotoStatuses(
      meals,
      dailySummary?.entries || [],
      { isToday, now: new Date() },
    ),
    [dailySummary?.entries, isToday, meals],
  );

  const selectedMeal = useMemo(
    () => statusRows.find((row) => row.id === selectedMealId) || null,
    [selectedMealId, statusRows],
  );

  const pendingCount = useMemo(
    () => statusRows.filter((row) => row.status === 'pending').length,
    [statusRows],
  );

  const loadDailySummary = useCallback(async () => {
    try {
      const summary = await request<DailySummary>(foodDiaryPath('/food-diary/today'));
      setDailySummary(summary);
    } catch {
      setDailySummary(null);
    }
  }, [foodDiaryPath, request]);

  useEffect(() => {
    if (!open) return;
    void loadDailySummary();
  }, [loadDailySummary, open, selectedDateKey]);

  useEffect(() => {
    if (!open) return;
    const fallback = getMealIdForTime(new Date())
      || getMealIdForTimeFromMeals(
        meals.map((meal) => ({ id: meal.id, label: meal.label, time: meal.time || '' })),
        new Date(),
      )
      || meals[0]?.id
      || '';
    setSelectedMealId((current) => {
      if (current && statusRows.some((row) => row.id === current)) return current;
      return pickDefaultMealId(statusRows, fallback);
    });
  }, [meals, open, statusRows, getMealIdForTime]);

  const dateLabel = formatDiaryDatePillLabel(selectedDateKey);

  return (
    <AppleBottomSheet
        visible={open}
        onClose={onClose}
        snapHeight={snapHeight}
        contentPadding={0}
        topRadius={28}
      >
        <View style={[styles.sheet, { height: bodyHeight, paddingBottom: 8 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Registrar refeição</Text>
            <Text style={styles.subtitle}>
              Escolha o dia e a refeição. A Bella analisa a foto e registra no diário.
            </Text>
          </View>

          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Dia do consumo</Text>
            <DiaryDatePicker variant="pill" inline />
          </View>

          {pendingCount > 0 ? (
            <View style={styles.alert}>
              <CircleAlert size={16} color="#b45309" strokeWidth={2} />
              <Text style={styles.alertText}>
                {pendingCount === 1
                  ? '1 refeição pendente neste dia'
                  : `${pendingCount} refeições pendentes neste dia`}
              </Text>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>Qual refeição?</Text>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {statusRows.map((row) => {
              const active = row.id === selectedMealId;
              const StatusIcon = row.status === 'done'
                ? CircleCheck
                : row.status === 'pending'
                  ? CircleAlert
                  : null;

              return (
                <Pressable
                  key={row.id}
                  style={[styles.mealRow, active && styles.mealRowActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelectedMealId(row.id)}
                >
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>

                  <View style={styles.mealCopy}>
                    <Text style={[styles.mealLabel, active && styles.mealLabelActive]} numberOfLines={1}>
                      {row.label}
                    </Text>
                    {row.time ? (
                      <Text style={styles.mealTime}>{formatMealTimeLabel(row.time)}</Text>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      row.status === 'done' && styles.statusDone,
                      row.status === 'pending' && styles.statusPending,
                    ]}
                  >
                    {StatusIcon ? (
                      <StatusIcon
                        size={13}
                        color={row.status === 'done' ? colors.primaryDark : '#b45309'}
                        strokeWidth={2}
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.statusText,
                        row.status === 'done' && styles.statusTextDone,
                        row.status === 'pending' && styles.statusTextPending,
                      ]}
                    >
                      {statusCopy(row)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <SheetFooter
            selectedMealId={selectedMealId}
            selectedMeal={selectedMeal}
            dateLabel={dateLabel}
            onStartPhoto={onStartPhoto}
          />
        </View>
      </AppleBottomSheet>
  );
}

function SheetFooter({
  selectedMealId,
  selectedMeal,
  dateLabel,
  onStartPhoto,
}: {
  selectedMealId: string;
  selectedMeal: MealPhotoStatusRow | null;
  dateLabel: string;
  onStartPhoto: (meal: MealPhotoTarget) => void;
}) {
  const { dismiss, dismissThen } = useBottomSheetDismiss();

  function handleStartPhoto() {
    if (!selectedMeal) return;
    const meal: MealPhotoTarget = { id: selectedMeal.id, label: selectedMeal.label };
    dismissThen(() => {
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => onStartPhoto(meal), 320);
      });
    });
  }

  return (
    <View style={styles.footer}>
      <Text style={styles.footerHint} numberOfLines={1}>
        {selectedMeal
          ? `${dateLabel} · ${selectedMeal.label}`
          : 'Selecione uma refeição'}
      </Text>
      <Pressable
        style={[styles.cta, !selectedMealId && styles.ctaDisabled]}
        disabled={!selectedMealId}
        onPress={handleStartPhoto}
      >
        <CameraIcon size={18} color="#fff" />
        <Text style={styles.ctaText}>Enviar foto do prato</Text>
      </Pressable>
      <Pressable style={styles.cancel} onPress={dismiss}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: spacing[4],
  },
  header: {
    paddingTop: 4,
    paddingBottom: spacing[3],
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
  },
  dateRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radii.control,
    backgroundColor: colors.primarySoft,
  },
  dateLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing[3],
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.control,
    backgroundColor: '#fff4e5',
  },
  alertText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#b45309',
  },
  sectionLabel: {
    marginBottom: 10,
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    gap: 8,
    paddingBottom: 8,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: 56,
    paddingHorizontal: spacing[3],
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
  },
  mealRowActive: {
    borderColor: colors.primary,
    backgroundColor: '#f7faf5',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  mealCopy: { flex: 1, minWidth: 0 },
  mealLabel: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  mealLabelActive: {
    color: colors.primaryDark,
  },
  mealTime: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.track,
  },
  statusDone: {
    backgroundColor: colors.primarySoft,
  },
  statusPending: {
    backgroundColor: '#fff4e5',
  },
  statusText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  statusTextDone: {
    color: colors.primaryDark,
  },
  statusTextPending: {
    color: '#b45309',
  },
  footer: {
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 10,
  },
  footerHint: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  cta: {
    minHeight: 52,
    borderRadius: radii.control,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#fff',
  },
  cancel: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.textMuted,
  },
});
