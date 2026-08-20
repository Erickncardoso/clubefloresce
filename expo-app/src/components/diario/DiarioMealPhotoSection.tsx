import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import CameraIcon from '@/components/icons/CameraIcon';
import { useDiaryDate } from '@/hooks/useDiaryDate';
import { usePatientApi } from '@/hooks/usePatientApi';
import { usePatientMealPlan } from '@/hooks/usePatientMealPlan';
import { useMealPlan } from '@/hooks/useMealPlan';
import { buildMealPhotoStatuses } from '@/lib/meal-photo-status';
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
  onPressUpload: () => void;
  refreshToken?: number;
};

export default function DiarioMealPhotoSection({ onPressUpload, refreshToken = 0 }: Props) {
  const { request } = usePatientApi();
  const { foodDiaryPath, isToday } = useDiaryDate();
  const { planRecord } = usePatientMealPlan();
  const { mealList } = useMealPlan(planRecord);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);

  const meals = mealList.length ? mealList : FALLBACK_MEALS;

  const loadDailySummary = useCallback(async () => {
    try {
      const summary = await request<DailySummary>(foodDiaryPath('/food-diary/today'));
      setDailySummary(summary);
    } catch {
      setDailySummary(null);
    }
  }, [foodDiaryPath, request]);

  useEffect(() => {
    void loadDailySummary();
  }, [loadDailySummary, refreshToken]);

  const statusRows = useMemo(
    () => buildMealPhotoStatuses(
      meals,
      dailySummary?.entries || [],
      { isToday, now: new Date() },
    ),
    [dailySummary?.entries, isToday, meals],
  );

  const pendingCount = statusRows.filter((row) => row.status === 'pending').length;
  const doneCount = statusRows.filter((row) => row.status === 'done').length;

  return (
    <View style={styles.card}>
        <Text style={styles.title}>Fotos dos seus pratos</Text>
        <Text style={styles.copy}>
          Envie a foto da refeição. A Bella registra no diário e sua nutri curte e comenta.
        </Text>

        {statusRows.length ? (
          <View style={styles.stats}>
            <Text style={styles.stat}>
              {doneCount} enviada{doneCount === 1 ? '' : 's'}
            </Text>
            {pendingCount > 0 ? (
              <>
                <Text style={styles.statDot}>·</Text>
                <Text style={[styles.stat, styles.statPending]}>
                  {pendingCount} pendente{pendingCount === 1 ? '' : 's'}
                </Text>
              </>
            ) : null}
          </View>
        ) : null}

        <Pressable style={styles.cta} onPress={onPressUpload}>
          <View style={styles.ctaIcon}>
            <CameraIcon size={18} color={colors.primaryDark} />
          </View>
          <View style={styles.ctaCopy}>
            <Text style={styles.ctaTitle}>Enviar foto do prato</Text>
            <Text style={styles.ctaSub}>Escolher dia e refeição</Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
        </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: 4,
    paddingBottom: 18,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
  },
  copy: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  stat: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primaryDark,
  },
  statPending: {
    color: '#b45309',
  },
  statDot: {
    color: colors.textMuted,
  },
  cta: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: 64,
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
  },
  ctaIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.control,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaCopy: {
    flex: 1,
    minWidth: 0,
  },
  ctaTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  ctaSub: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
});
