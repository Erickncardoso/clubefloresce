import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Plus } from 'lucide-react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import CfButton from '@/components/ui/CfButton';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { usePatientApi } from '@/hooks/usePatientApi';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type MealItem = { display?: string; key?: string };
type Meal = { id: string; label: string; short?: string; time?: string; items?: MealItem[] };

export default function DietaScreen() {
  const router = useRouter();
  const { request } = usePatientApi();
  const [loading, setLoading] = useState(true);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [activeMealId, setActiveMealId] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await request<{ plan?: { meals?: Meal[] } }>('/meal-plan/me');
        const list = res?.plan?.meals || [];
        setMeals(list);
        setActiveMealId(list[0]?.id || '');
      } catch {
        setMeals([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [request]);

  const currentMeal = useMemo(
    () => meals.find((meal) => meal.id === activeMealId) || meals[0],
    [activeMealId, meals],
  );

  const progressLabel = useMemo(() => {
    const items = currentMeal?.items || [];
    if (!items.length) return '';
    const done = items.filter((_, index) => checked[`${currentMeal?.id}:${index}`]).length;
    return `${done}/${items.length} itens marcados`;
  }, [checked, currentMeal]);

  if (loading) {
    return (
      <PatientShell>
        <PatientHeader title="Minha dieta" showBack backTo="/inicio" showBell={false} showMenu={false} />
        <LoadingScreen />
      </PatientShell>
    );
  }

  if (!meals.length) {
    return (
      <PatientShell>
        <PatientHeader title="Minha dieta" showBack backTo="/inicio" showBell={false} showMenu={false} />
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Plano alimentar não disponível</Text>
          <Text style={styles.emptyText}>
            Sua nutricionista ainda não enviou o cardápio. Quando estiver pronto, ele aparecerá aqui.
          </Text>
        </View>
      </PatientShell>
    );
  }

  return (
    <PatientShell>
      <PatientHeader title="Minha dieta" showBack backTo="/inicio" showBell={false} showMenu={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.tabs}>
          {meals.map((meal) => (
            <Pressable
              key={meal.id}
              style={[styles.tab, activeMealId === meal.id && styles.tabActive]}
              onPress={() => setActiveMealId(meal.id)}
            >
              <Text style={styles.tabText}>{meal.short || meal.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.mealTitle}>{currentMeal?.label}</Text>
          {currentMeal?.time ? <Text style={styles.mealMeta}>{currentMeal.time}</Text> : null}
          {progressLabel ? <Text style={styles.progress}>{progressLabel}</Text> : null}

          {(currentMeal?.items || []).map((item, index) => {
            const key = `${currentMeal?.id}:${index}`;
            const isChecked = Boolean(checked[key]);
            return (
              <Pressable
                key={item.key || key}
                style={styles.itemRow}
                onPress={() => setChecked((prev) => ({ ...prev, [key]: !prev[key] }))}
              >
                <View style={[styles.check, isChecked && styles.checkOn]}>
                  {isChecked ? <Check color="#fff" size={14} /> : null}
                </View>
                <Text style={[styles.itemText, isChecked && styles.itemDone]}>
                  {item.display || `Item ${index + 1}`}
                </Text>
              </Pressable>
            );
          })}

          <CfButton
            variant="ghost"
            label="Calculadora de substituição"
            onPress={() => router.push('/substituicao' as never)}
          />
          <CfButton
            label="Tirar foto da refeição"
            onPress={() => router.push('/bella/chat/meal-photo' as never)}
          />
        </View>
      </ScrollView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[6] },
  empty: { padding: spacing[5], gap: spacing[3] },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 20 },
  emptyText: { fontFamily: fonts.regular, color: colors.textMuted, lineHeight: 20 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  tab: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  tabText: { fontFamily: fonts.semibold, fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[3],
  },
  mealTitle: { fontFamily: fonts.bold, fontSize: 18 },
  mealMeta: { fontFamily: fonts.regular, color: colors.textMuted },
  progress: { fontFamily: fonts.semibold, color: colors.primaryDark },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: 6 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  itemText: { flex: 1, fontFamily: fonts.regular, fontSize: 15 },
  itemDone: { textDecorationLine: 'line-through', color: colors.textMuted },
});
