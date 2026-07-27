import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowLeftRight,
  Camera,
  Plus,
  Upload,
} from 'lucide-react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import LoadingScreen from '@/components/ui/LoadingScreen';
import BellaDailyDiaryBar from '@/components/dieta/BellaDailyDiaryBar';
import DietaCheckIcon from '@/components/dieta/DietaCheckIcon';
import DietaMealPlanUploadCard from '@/components/dieta/DietaMealPlanUploadCard';
import { useDietaDiarySync, type DailySummary } from '@/hooks/useDietaDiarySync';
import { usePatientApi } from '@/hooks/usePatientApi';
import { usePatientMealPlan } from '@/hooks/usePatientMealPlan';
import { countDone, loadChecked, saveChecked } from '@/lib/dieta-progress';
import { getMealById } from '@/lib/meal-plan-api';
import { getMealIdForTimeFromMeals } from '@/lib/meal-plan-time';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type ViewMode = 'today' | 'week';

export default function DietaScreen() {
  const router = useRouter();
  const { request } = usePatientApi();
  const { queueSyncMealCheck } = useDietaDiarySync();
  const {
    meals,
    planTitle,
    hasPlan,
    loading: planLoading,
    uploading: planUploading,
    error: planError,
    fetchPlan,
    uploadPdf,
  } = usePatientMealPlan();

  const [view, setView] = useState<ViewMode>('today');
  const [activeMealId, setActiveMealId] = useState('');
  const [checkedItems, setCheckedItems] = useState<boolean[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [booting, setBooting] = useState(true);

  const currentMeal = useMemo(
    () => getMealById(meals, activeMealId) || meals[0] || null,
    [activeMealId, meals],
  );

  const progressLabel = useMemo(() => {
    if (!currentMeal) return '';
    const total = currentMeal.itemLabels.length;
    const done = countDone(checkedItems);
    if (!total) return '';
    if (done === total) return 'Refeição concluída hoje';
    return `${done} de ${total} itens marcados`;
  }, [checkedItems, currentMeal]);

  const loadDailySummary = useCallback(async () => {
    try {
      const summary = await request<DailySummary>('/food-diary/today');
      setDailySummary(summary);
    } catch {
      setDailySummary(null);
    }
  }, [request]);

  const syncChecked = useCallback(async (mealId: string, preserveChecked = false) => {
    const meal = getMealById(meals, mealId);
    if (!meal) {
      setCheckedItems([]);
      return;
    }

    const count = meal.itemLabels.length;
    const previous = preserveChecked ? checkedItems : await loadChecked(mealId, count);
    const next = Array(count).fill(false);
    for (let i = 0; i < Math.min(previous.length, count); i += 1) {
      next[i] = Boolean(previous[i]);
    }
    setCheckedItems(next);
    await saveChecked(mealId, next);
  }, [checkedItems, meals]);

  const bootstrap = useCallback(async () => {
    setBooting(true);
    await fetchPlan();
    await loadDailySummary();
    setBooting(false);
  }, [fetchPlan, loadDailySummary]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!meals.length) return;
    const mealId = getMealIdForTimeFromMeals(meals) || meals[0]?.id || '';
    setActiveMealId(mealId);
    void syncChecked(mealId);
  }, [meals]);

  async function selectMeal(mealId: string) {
    setActiveMealId(mealId);
    await syncChecked(mealId);
  }

  async function toggleItem(index: number) {
    if (!currentMeal) return;
    const next = [...checkedItems];
    next[index] = !next[index];
    setCheckedItems(next);
    await saveChecked(activeMealId, next);
    queueSyncMealCheck(activeMealId, currentMeal, next, (summary) => {
      if (summary) setDailySummary(summary);
    });
  }

  function weekProgressLabel(mealId: string) {
    const meal = getMealById(meals, mealId);
    if (!meal) return '';
    return `${meal.itemLabels.length} itens`;
  }

  async function handlePlanUploaded() {
    await fetchPlan();
    await loadDailySummary();
  }

  async function handleReupload() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    try {
      await uploadPdf(asset.uri, asset.name || 'plano-alimentar.pdf');
      await handlePlanUploaded();
    } catch {
      /* erro no hook */
    }
  }

  function openMealFromWeek(mealId: string) {
    setActiveMealId(mealId);
    void syncChecked(mealId);
    setView('today');
  }

  function takePhotoNow() {
    router.push({
      pathname: '/bella/chat/meal-photo',
      params: {
        from: 'dieta',
        meal: activeMealId,
        label: currentMeal?.label || 'Refeição',
        camera: '1',
      },
    } as never);
  }

  function openGallery() {
    router.push({
      pathname: '/bella/chat/meal',
      params: {
        from: 'dieta',
        meal: activeMealId,
        label: currentMeal?.label || 'Refeição',
      },
    } as never);
  }

  async function deleteDiaryEntry(entry: NonNullable<DailySummary['entries']>[number]) {
    if (!entry?.id) return;
    Alert.alert(
      'Remover refeição?',
      `Deseja remover ${entry.mealLabel || 'esta refeição'} do diário?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await request<{ dailySummary?: DailySummary }>(
                `/food-diary/entries/${entry.id}`,
                { method: 'DELETE' },
              );
              if (res.dailySummary) setDailySummary(res.dailySummary);
              else await loadDailySummary();
            } catch {
              Alert.alert('Erro', 'Não foi possível remover a refeição.');
            }
          },
        },
      ],
    );
  }

  if (booting || planLoading) {
    return (
      <PatientShell>
        <PatientHeader title="Minha dieta" showBack backTo="/inicio" showBell={false} showMenu={false} />
        <LoadingScreen />
      </PatientShell>
    );
  }

  return (
    <PatientShell>
      <PatientHeader title="Minha dieta" showBack backTo="/inicio" showBell={false} showMenu={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <BellaDailyDiaryBar
          summary={dailySummary}
          manageable
          onDeleteEntry={deleteDiaryEntry}
        />

        {!hasPlan ? (
          <DietaMealPlanUploadCard
            uploading={planUploading}
            error={planError}
            onUpload={async (uri, name) => {
              await uploadPdf(uri, name);
              await handlePlanUploaded();
            }}
          />
        ) : (
          <>
            <View style={styles.tabs}>
              <Pressable
                style={[styles.tab, view === 'today' && styles.tabActive]}
                onPress={() => setView('today')}
              >
                <Text style={[styles.tabText, view === 'today' && styles.tabTextActive]}>Hoje</Text>
              </Pressable>
              <Pressable
                style={[styles.tab, view === 'week' && styles.tabActive]}
                onPress={() => setView('week')}
              >
                <Text style={[styles.tabText, view === 'week' && styles.tabTextActive]}>Plano semanal</Text>
              </Pressable>
            </View>

            {view === 'today' ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mealsRow}>
                  {meals.map((meal) => {
                    const Icon = meal.icon;
                    const active = activeMealId === meal.id;
                    return (
                      <Pressable
                        key={meal.id}
                        style={[styles.mealBtn, active && styles.mealBtnActive]}
                        onPress={() => selectMeal(meal.id)}
                      >
                        <Icon size={18} color={active ? colors.primaryDark : colors.textMuted} />
                        <Text style={[styles.mealBtnText, active && styles.mealBtnTextActive]}>{meal.short}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {currentMeal ? (
                  <View style={styles.card}>
                    <Text style={styles.mealLabel}>{currentMeal.label}</Text>
                    <Text style={styles.mealMeta}>
                      {currentMeal.time} · Refeição {currentMeal.index} de {currentMeal.total}
                    </Text>
                    {progressLabel ? <Text style={styles.progress}>{progressLabel}</Text> : null}

                    {currentMeal.items.map((item, index) => (
                      <View key={item.key || `${activeMealId}-${index}`} style={styles.checkRow}>
                        <Pressable style={styles.checkBtn} onPress={() => toggleItem(index)}>
                          <DietaCheckIcon completed={Boolean(checkedItems[index])} />
                        </Pressable>
                        <Text
                          style={[
                            styles.itemText,
                            checkedItems[index] && styles.itemDone,
                            item.isSubstituted && styles.itemSubstituted,
                            item.isExtra && styles.itemExtra,
                          ]}
                        >
                          {item.display || currentMeal.itemLabels[index]}
                        </Text>
                      </View>
                    ))}

                    <Pressable style={styles.addExtraBtn}>
                      <Plus size={16} color={colors.primaryDark} />
                      <Text style={styles.addExtraText}>Adicionar outro alimento</Text>
                    </Pressable>

                    <Pressable
                      style={styles.subsLink}
                      onPress={() => router.push('/substituicao' as never)}
                    >
                      <ArrowLeftRight size={16} color={colors.text} />
                      <Text style={styles.subsLinkText}>Calculadora de substituição</Text>
                    </Pressable>

                    <View style={styles.actions}>
                      <Pressable style={styles.actionPrimary} onPress={takePhotoNow}>
                        <Camera size={15} color="#fff" />
                        <Text style={styles.actionPrimaryText}>Tirar foto agora</Text>
                      </Pressable>
                      <Pressable style={styles.actionOutline} onPress={openGallery}>
                        <Text style={styles.actionOutlineText}>Escolher da galeria</Text>
                      </Pressable>
                    </View>

                    <Pressable onPress={() => setView('week')}>
                      <Text style={styles.planLink}>Ver plano completo</Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.weekIntro}>
                  Seu plano alimentar de hoje, refeição por refeição.
                </Text>
                {meals.map((meal) => {
                  const entry = getMealById(meals, meal.id);
                  if (!entry) return null;
                  return (
                    <Pressable key={meal.id} style={styles.weekCard} onPress={() => openMealFromWeek(meal.id)}>
                      <Text style={styles.weekTitle}>{entry.label}</Text>
                      <Text style={styles.weekMeta}>
                        {entry.time} · {entry.index} de {entry.total}
                      </Text>
                      <Text style={styles.weekProgress}>{weekProgressLabel(meal.id)}</Text>
                      {entry.itemLabels.map((label, index) => (
                        <Text key={`${meal.id}-${index}`} style={styles.weekItem}>• {label}</Text>
                      ))}
                    </Pressable>
                  );
                })}
              </>
            )}

            <View style={styles.footer}>
              <Text style={styles.planSource}>{planTitle}</Text>
              <Pressable style={styles.reupload} onPress={handleReupload} disabled={planUploading}>
                <Upload size={14} color={colors.primary} />
                <Text style={styles.reuploadText}>{planUploading ? 'Atualizando…' : 'Atualizar PDF'}</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: spacing[6], gap: spacing[3] },
  tabs: {
    flexDirection: 'row',
    gap: spacing[2],
    padding: 4,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primarySoft },
  tabText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  tabTextActive: { fontFamily: fonts.semibold, color: colors.primaryDark },
  mealsRow: { gap: 6, paddingBottom: 4 },
  mealBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 56,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealBtnActive: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  mealBtnText: { fontFamily: fonts.medium, fontSize: 10, color: colors.textMuted },
  mealBtnTextActive: { color: colors.primaryDark, fontFamily: fonts.semibold },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[3],
  },
  mealLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  mealMeta: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  progress: { fontFamily: fonts.medium, fontSize: 12, color: colors.primaryDark },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  checkBtn: { padding: 0 },
  itemText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text, lineHeight: 20 },
  itemDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  itemSubstituted: { color: colors.primaryDark },
  itemExtra: { color: colors.primaryDark },
  addExtraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primarySoft,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  addExtraText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primaryDark },
  subsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  subsLinkText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  actions: { gap: spacing[2], marginTop: spacing[1] },
  actionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    paddingVertical: spacing[3],
    borderRadius: 10,
  },
  actionPrimaryText: { fontFamily: fonts.semibold, fontSize: 13, color: '#fff' },
  actionOutline: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primarySoft,
    backgroundColor: colors.surface,
  },
  actionOutlineText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  planLink: {
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
    marginTop: spacing[2],
  },
  weekIntro: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  weekCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[3],
    gap: 4,
  },
  weekTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  weekMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  weekProgress: { fontFamily: fonts.medium, fontSize: 12, color: colors.primaryDark },
  weekItem: { fontFamily: fonts.regular, fontSize: 13, color: colors.text, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  planSource: { flex: 1, fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  reupload: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reuploadText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.primary },
});
