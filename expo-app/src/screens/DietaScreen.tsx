import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Calculator,
  Camera,
  ChevronRight,
  CircleCheck,
  ImagePlus,
  Layers,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import LoadingScreen from '@/components/ui/LoadingScreen';
import BellaDailyDiaryBar from '@/components/dieta/BellaDailyDiaryBar';
import DietaAddExtraFoodModal from '@/components/dieta/DietaAddExtraFoodModal';
import DietaCheckIcon from '@/components/dieta/DietaCheckIcon';
import DietaMealPlanOptionPickerModal from '@/components/dieta/DietaMealPlanOptionPickerModal';
import DietaMealPlanOptionsIntroModal from '@/components/dieta/DietaMealPlanOptionsIntroModal';
import DietaMealPlanRecipeDetailSheet from '@/components/dieta/DietaMealPlanRecipeDetailSheet';
import DietaMealPlanUploadCard from '@/components/dieta/DietaMealPlanUploadCard';
import DietaMealSubstitutionsModal from '@/components/dieta/DietaMealSubstitutionsModal';
import MealPhotoFlow from '@/components/diario/MealPhotoFlow';
import { useDietaDiarySync, type DailySummary } from '@/hooks/useDietaDiarySync';
import { useAppToast } from '@/hooks/useAppToast';
import { toastSuccess } from '@/lib/app-toast';
import { useMealExtraItems } from '@/hooks/useMealExtraItems';
import { useMealItemOverrides } from '@/hooks/useMealItemOverrides';
import { useMealPlan } from '@/hooks/useMealPlan';
import { useMealPlanOptionSelections } from '@/hooks/useMealPlanOptionSelections';
import { useMealSubstitutions } from '@/hooks/useMealSubstitutions';
import { usePatientApi } from '@/hooks/usePatientApi';
import { usePatientMealPlan } from '@/hooks/usePatientMealPlan';
import { countDone, loadChecked, saveChecked } from '@/lib/dieta-progress';
import { applyOptimisticPlanCheck } from '@/lib/plan-diary-sync';
import type { MealPlanRecipe } from '@/lib/meal-plan-api';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type ViewMode = 'today' | 'week';

export default function DietaScreen() {
  const router = useRouter();
  const { showToast } = useAppToast();
  const { request } = usePatientApi();
  const { queueSyncMealCheck, resyncAllCheckedMeals } = useDietaDiarySync();
  const {
    planRecord,
    planChecked,
    planTitle,
    hasPlan,
    loading: planFetchLoading,
    uploading: planUploading,
    error: planError,
    fetchPlan,
    uploadPdf,
  } = usePatientMealPlan();

  const {
    mealList,
    mealOrder,
    getMealById,
    getMealIdForTime,
    optionGroupForMeal,
  } = useMealPlan(planRecord);

  const {
    needsOptionSelection,
    optionGroups,
    mealHasOptionAlternatives,
  } = useMealPlanOptionSelections();

  const { getSubstitutionGroupsForMeal, mealHasSubstitutions } = useMealSubstitutions();
  const { addExtraItem, removeExtraItem } = useMealExtraItems();
  const { overridesRevision } = useMealItemOverrides();

  const [view, setView] = useState<ViewMode>('today');
  const [activeMealId, setActiveMealId] = useState('');
  const [checkedItems, setCheckedItems] = useState<boolean[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [planLoading, setPlanLoading] = useState(!planChecked);

  const [substitutionsOpen, setSubstitutionsOpen] = useState(false);
  const [optionPickerOpen, setOptionPickerOpen] = useState(false);
  const [optionPickerRequired, setOptionPickerRequired] = useState(false);
  const [optionPickerFocusSlot, setOptionPickerFocusSlot] = useState('');
  const [optionPickerTitle, setOptionPickerTitle] = useState('Escolha suas opções');
  const [optionIntroOpen, setOptionIntroOpen] = useState(false);
  const [extraFoodOpen, setExtraFoodOpen] = useState(false);
  const [recipeDetailOpen, setRecipeDetailOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<MealPlanRecipe | null>(null);
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false);
  const [photoMeal, setPhotoMeal] = useState<{ id: string; label?: string | null } | null>(null);

  const checkedItemsRef = useRef(checkedItems);
  checkedItemsRef.current = checkedItems;

  const [mealProgressById, setMealProgressById] = useState<Record<string, { done: number; total: number }>>({});

  const currentMeal = useMemo(
    () => (activeMealId ? getMealById(activeMealId) : null),
    [activeMealId, getMealById, overridesRevision],
  );

  const activeMealDefinition = useMemo(
    () => mealList.find((meal) => meal.id === activeMealId) || null,
    [activeMealId, mealList],
  );

  const hasMealOptionGroups = optionGroups.length > 0;
  const optionSlotsLabel = optionGroups.map((group) => group.label).filter(Boolean).join(', ');
  const substitutionGroups = useMemo(
    () => getSubstitutionGroupsForMeal(activeMealId),
    [activeMealId, getSubstitutionGroupsForMeal, overridesRevision],
  );
  const hasSubstitutions = mealHasSubstitutions(activeMealId);
  const activeMealHasOptionAlternatives = mealHasOptionAlternatives(activeMealId);

  const currentMealPercent = useMemo(() => {
    const total = currentMeal?.itemLabels.length || 0;
    if (!total) return 0;
    return Math.round((countDone(checkedItems) / total) * 100);
  }, [checkedItems, currentMeal]);

  const completedMealsCount = useMemo(
    () => mealList.filter((meal) => {
      const progress = mealProgressById[meal.id];
      return Boolean(progress?.total && progress.done === progress.total);
    }).length,
    [mealList, mealProgressById],
  );

  useEffect(() => {
    const total = currentMeal?.itemLabels.length || checkedItems.length;
    if (!activeMealId || !total) return;
    const done = countDone(checkedItems);
    setMealProgressById((prev) => {
      const existing = prev[activeMealId];
      if (existing?.done === done && existing?.total === total) return prev;
      return { ...prev, [activeMealId]: { done, total } };
    });
  }, [activeMealId, checkedItems, currentMeal]);

  useEffect(() => {
    let cancelled = false;

    async function loadOtherMealsProgress() {
      const next: Record<string, { done: number; total: number }> = {};
      for (const meal of mealList) {
        const entry = getMealById(meal.id);
        if (!entry) continue;
        const total = entry.itemLabels.length;
        if (meal.id === activeMealId) {
          next[meal.id] = { done: countDone(checkedItemsRef.current), total };
          continue;
        }
        const states = await loadChecked(meal.id, total);
        next[meal.id] = { done: countDone(states), total };
      }
      if (cancelled) return;
      setMealProgressById((prev) => ({
        ...next,
        ...(activeMealId && prev[activeMealId] ? { [activeMealId]: prev[activeMealId] } : {}),
      }));
    }

    if (mealList.length) void loadOtherMealsProgress();
    return () => {
      cancelled = true;
    };
  }, [activeMealId, getMealById, mealList, overridesRevision]);

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
    const meal = getMealById(mealId);
    if (!meal) {
      setCheckedItems([]);
      return;
    }

    const count = meal.itemLabels.length;
    const previous = preserveChecked ? checkedItemsRef.current : await loadChecked(mealId, count);
    const next = Array(count).fill(false);
    for (let i = 0; i < Math.min(previous.length, count); i += 1) {
      next[i] = Boolean(previous[i]);
    }
    setCheckedItems(next);
    await saveChecked(mealId, next);
  }, [getMealById]);

  function isMealComplete(mealId: string) {
    const progress = mealProgressById[mealId];
    return Boolean(progress?.total && progress.done === progress.total);
  }

  function weekProgressLabel(mealId: string) {
    const progress = mealProgressById[mealId];
    if (!progress?.total) {
      const meal = getMealById(mealId);
      return meal ? `${meal.itemLabels.length} itens` : '';
    }
    if (progress.done === progress.total) return 'Concluída hoje';
    return `${progress.done}/${progress.total} itens marcados`;
  }

  function mealProgressPercent(mealId: string) {
    const progress = mealProgressById[mealId];
    if (!progress?.total) return 0;
    return Math.round((progress.done / progress.total) * 100);
  }

  function resolveActiveMealFromRoute() {
    return getMealIdForTime() || mealOrder[0] || '';
  }

  function openOptionIntroIfNeeded() {
    if (!needsOptionSelection) return false;
    setOptionIntroOpen(true);
    return true;
  }

  function openOptionPicker(options: { required?: boolean; focusSlotKey?: string; title?: string } = {}) {
    const { required = false, focusSlotKey = '', title = 'Escolha suas opções' } = options;
    setOptionPickerRequired(required);
    setOptionPickerFocusSlot(focusSlotKey);
    setOptionPickerTitle(title);
    setOptionPickerOpen(true);
  }

  function openOptionPickerForActiveMeal() {
    const group = optionGroupForMeal(activeMealId);
    if (!group) {
      openAllMealOptions();
      return;
    }
    openOptionPicker({
      required: false,
      focusSlotKey: group.slotKey,
      title: `Trocar opção · ${group.label}`,
    });
  }

  function openAllMealOptions() {
    if (!hasMealOptionGroups) return;
    openOptionPicker({
      required: needsOptionSelection,
      focusSlotKey: '',
      title: 'Escolha suas opções',
    });
  }

  function hydrateDietaFromPlan() {
    if (!hasPlan) return false;
    const mealId = resolveActiveMealFromRoute();
    if (mealId) {
      setActiveMealId(mealId);
      void syncChecked(mealId);
    }
    openOptionIntroIfNeeded();
    return true;
  }

  const syncAllCheckedMealsIfNeeded = useCallback(async () => {
    try {
      const summary = await resyncAllCheckedMeals(
        getMealById,
        mealOrder,
        loadChecked,
        countDone,
      );
      if (summary) setDailySummary(summary);
      else await loadDailySummary();
    } catch {
      await loadDailySummary();
    }
  }, [getMealById, loadDailySummary, mealOrder, resyncAllCheckedMeals]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (planChecked) {
        if (hydrateDietaFromPlan()) {
          if (!cancelled) setPlanLoading(false);
          void syncAllCheckedMealsIfNeeded();
          return;
        }
        if (!cancelled) setPlanLoading(false);
        void loadDailySummary();
        return;
      }

      try {
        await fetchPlan();
        if (cancelled) return;
        if (hydrateDietaFromPlan()) {
          void syncAllCheckedMealsIfNeeded();
        } else {
          void loadDailySummary();
        }
      } finally {
        if (!cancelled) setPlanLoading(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!planChecked || planFetchLoading || planLoading) return;
    if (hydrateDietaFromPlan()) {
      setPlanLoading(false);
      void syncAllCheckedMealsIfNeeded();
    } else {
      setPlanLoading(false);
      void loadDailySummary();
    }
  }, [planChecked, planFetchLoading]);

  useEffect(() => {
    if (!needsOptionSelection || planLoading || optionPickerOpen || optionIntroOpen) return;
    openOptionIntroIfNeeded();
  }, [needsOptionSelection, planLoading, optionPickerOpen, optionIntroOpen]);

  useEffect(() => {
    void syncChecked(activeMealId, true);
  }, [overridesRevision]);

  async function selectMeal(mealId: string) {
    setActiveMealId(mealId);
    await syncChecked(mealId);
    setSubstitutionsOpen(false);
  }

  function toggleItem(index: number) {
    if (!currentMeal) return;
    const total = currentMeal.items.length || currentMeal.itemLabels.length;
    if (!Number.isInteger(index) || index < 0 || index >= total) return;

    const current = checkedItemsRef.current;
    const next = Array.from({ length: total }, (_, itemIndex) => Boolean(current[itemIndex]));
    next[index] = !next[index];
    checkedItemsRef.current = next;
    setCheckedItems(next);
    setMealProgressById((prev) => ({
      ...prev,
      [activeMealId]: { done: countDone(next), total: next.length },
    }));
    void saveChecked(activeMealId, next);

    if (next[index]) {
      const label = currentMeal.items[index]?.display || currentMeal.itemLabels[index] || 'Item';
      showToast(toastSuccess('Registrado no diário', label));
    }
    setDailySummary((prev) => applyOptimisticPlanCheck(prev, activeMealId, currentMeal, next) ?? prev);
    queueSyncMealCheck(activeMealId, currentMeal, next, (summary) => {
      if (summary) setDailySummary(summary);
    });
  }

  async function onExtraFoodAdded(payload: { food: { id?: string; name: string }; amount: number; unit: string }) {
    const added = addExtraItem(activeMealId, payload.food, payload.amount, payload.unit);
    if (!added) return;

    await syncChecked(activeMealId, true);
    const next = [...checkedItemsRef.current];
    next[next.length - 1] = true;
    setCheckedItems(next);
    await saveChecked(activeMealId, next);

    const meal = getMealById(activeMealId);
    showToast(toastSuccess('Registrado no diário', payload.food.name));
    setDailySummary((prev) => applyOptimisticPlanCheck(prev, activeMealId, meal, next) ?? prev);
    queueSyncMealCheck(activeMealId, meal, next, (summary) => {
      if (summary) setDailySummary(summary);
    });
  }

  async function removeExtraItemAt(index: number, itemId?: string) {
    if (!itemId) return;
    removeExtraItem(activeMealId, itemId);

    const next = checkedItemsRef.current.filter((_, itemIndex) => itemIndex !== index);
    setCheckedItems(next);
    await saveChecked(activeMealId, next);

    const meal = getMealById(activeMealId);
    setDailySummary((prev) => applyOptimisticPlanCheck(prev, activeMealId, meal, next) ?? prev);
    queueSyncMealCheck(activeMealId, meal, next, (summary) => {
      if (summary) setDailySummary(summary);
    });
  }

  function openRecipeDetail(recipe: MealPlanRecipe) {
    setSelectedRecipe(recipe);
    setRecipeDetailOpen(true);
  }

  function onOptionIntroChoose() {
    setOptionIntroOpen(false);
    openOptionPicker({ required: true });
  }

  function onOptionSelectionsSaved() {
    setOptionIntroOpen(false);
    setOptionPickerRequired(false);
    setOptionPickerFocusSlot('');
    setOptionPickerOpen(false);

    const mealId = resolveActiveMealFromRoute();
    if (mealId) {
      setActiveMealId(mealId);
      void syncChecked(mealId);
    } else if (mealOrder.length) {
      setActiveMealId(mealOrder[0]);
      void syncChecked(mealOrder[0]);
    }
  }

  async function handlePlanUploaded() {
    const mealId = resolveActiveMealFromRoute();
    if (mealId) {
      setActiveMealId(mealId);
      await syncChecked(mealId);
    }
    await loadDailySummary();
    openOptionIntroIfNeeded();
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

  function openPhotoPicker(meal?: { id: string; label?: string | null } | null) {
    if (!meal?.id) return;
    setPhotoMeal(meal);
    setPhotoPickerOpen(true);
  }

  function takePhotoNow() {
    openPhotoPicker(currentMeal);
  }

  function openGallery() {
    openPhotoPicker(currentMeal);
  }

  async function deleteDiaryEntry(entry: NonNullable<DailySummary['entries']>[number]) {
    if (!entry?.id) return;
    Alert.alert(
      'Remover refeição?',
      `Deseja remover ${entry.mealLabel || 'esta refeição'} do diário? As calorias do dia serão recalculadas.`,
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

  if (planLoading || (planFetchLoading && !planChecked)) {
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
                <Text style={[styles.tabText, view === 'week' && styles.tabTextActive]}>Plano completo</Text>
              </Pressable>
            </View>

            {view === 'today' ? (
              <>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>Refeições de hoje</Text>
                  <Text style={styles.sectionCount}>{completedMealsCount}/{mealList.length} concluídas</Text>
                </View>

                {hasMealOptionGroups ? (
                  <Pressable style={styles.optionsBanner} onPress={openAllMealOptions}>
                    <Layers size={18} color="#62785a" />
                    <View style={styles.optionsBannerCopy}>
                      <Text style={styles.optionsBannerTitle}>
                        {needsOptionSelection ? 'Escolher opções do cardápio' : 'Alterar opções do cardápio'}
                      </Text>
                      <Text style={styles.optionsBannerSubtitle}>
                        {needsOptionSelection
                          ? 'Seu plano tem alternativas — escolha e salve'
                          : 'Você pode trocar a opção salva quando quiser'}
                      </Text>
                    </View>
                    <ChevronRight size={16} color="#8a9086" />
                  </Pressable>
                ) : null}

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mealsRow}>
                  {mealList.map((meal) => {
                    const Icon = meal.icon;
                    const active = activeMealId === meal.id;
                    const complete = isMealComplete(meal.id);
                    return (
                      <Pressable
                        key={meal.id}
                        style={[styles.mealBtn, active && styles.mealBtnActive]}
                        onPress={() => selectMeal(meal.id)}
                      >
                        <View style={[styles.mealIconWrap, active && styles.mealIconWrapActive]}>
                          <Icon size={16} color={active ? '#687a5f' : '#7f8d76'} />
                        </View>
                        <Text style={[styles.mealBtnText, active && styles.mealBtnTextActive]}>{meal.short}</Text>
                        {complete ? <CircleCheck size={14} color="#6f8d65" /> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {currentMeal ? (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeading}>
                        {activeMealDefinition ? (
                          <View style={styles.cardIcon}>
                            <activeMealDefinition.icon size={19} color="#74836c" />
                          </View>
                        ) : null}
                        <View style={styles.cardHeadingCopy}>
                          <Text style={styles.mealLabel}>{currentMeal.label}</Text>
                          <Text style={styles.mealMeta}>
                            {currentMeal.time} · Refeição {currentMeal.index} de {currentMeal.total}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.cardPercent}>{currentMealPercent}%</Text>
                    </View>

                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${currentMealPercent}%` }]} />
                    </View>
                    {progressLabel ? <Text style={styles.progress}>{progressLabel}</Text> : null}

                    {currentMeal.items.map((item, index) => (
                      <Pressable
                        key={item.key || `${activeMealId}-${index}`}
                        style={styles.checkRow}
                        onPress={() => toggleItem(index)}
                      >
                        <View style={styles.checkBtn}>
                          <DietaCheckIcon completed={Boolean(checkedItems[index])} />
                        </View>
                        <View style={styles.itemCopy}>
                          {item.recipe ? (
                            <Pressable
                              onPress={(event) => {
                                event.stopPropagation();
                                openRecipeDetail(item.recipe!);
                              }}
                            >
                              <Text
                                style={[
                                  styles.itemText,
                                  checkedItems[index] && styles.itemDone,
                                  item.isSubstituted && styles.itemSubstituted,
                                  item.isExtra && styles.itemExtra,
                                  styles.recipeLink,
                                ]}
                              >
                                {item.display || currentMeal.itemLabels[index]}
                              </Text>
                            </Pressable>
                          ) : (
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
                          )}
                          {item.isSubstituted ? <Text style={styles.swapTag}>Substituído</Text> : null}
                          {item.isExtra ? <Text style={styles.extraTag}>Fora do plano</Text> : null}
                        </View>
                        {item.isExtra ? (
                          <Pressable
                            style={styles.removeBtn}
                            onPress={(event) => {
                              event.stopPropagation();
                              void removeExtraItemAt(index, item.id);
                            }}
                          >
                            <Trash2 size={15} color="#9b8178" />
                          </Pressable>
                        ) : null}
                      </Pressable>
                    ))}

                    <View style={styles.tools}>
                      <Pressable style={styles.toolBtn} onPress={() => setExtraFoodOpen(true)}>
                        <Plus size={14} color="#7e8b76" />
                        <Text style={styles.toolText}>Adicionar alimento</Text>
                      </Pressable>
                      {hasSubstitutions ? (
                        <Pressable style={styles.toolBtn} onPress={() => setSubstitutionsOpen(true)}>
                          <ArrowLeftRight size={14} color="#7e8b76" />
                          <Text style={styles.toolText}>Substituições</Text>
                        </Pressable>
                      ) : null}
                      {activeMealHasOptionAlternatives ? (
                        <Pressable style={styles.toolBtn} onPress={openOptionPickerForActiveMeal}>
                          <Layers size={14} color="#7e8b76" />
                          <Text style={styles.toolText}>Trocar opção</Text>
                        </Pressable>
                      ) : null}
                      <Pressable style={styles.toolBtn} onPress={() => router.push('/substituicao' as never)}>
                        <Calculator size={14} color="#7e8b76" />
                        <Text style={styles.toolText}>Calcular troca</Text>
                      </Pressable>
                    </View>

                    <View style={styles.register}>
                      <Text style={styles.registerTitle}>Registrar refeição</Text>
                      <Text style={styles.registerSubtitle}>Envie uma foto para a Bella analisar.</Text>
                      <View style={styles.actions}>
                        <Pressable style={[styles.actionPrimary, styles.actionPrimaryFlex]} onPress={takePhotoNow}>
                          <Camera size={15} color="#fff" />
                          <Text style={styles.actionPrimaryText}>Tirar foto</Text>
                        </Pressable>
                        <Pressable style={styles.actionOutline} onPress={openGallery}>
                          <ImagePlus size={15} color="#555b53" />
                          <Text style={styles.actionOutlineText}>Galeria</Text>
                        </Pressable>
                      </View>
                    </View>

                    <Pressable style={styles.planLink} onPress={() => setView('week')}>
                      <Text style={styles.planLinkText}>Ver todas as refeições</Text>
                      <ChevronRight size={15} color="#687264" />
                    </Pressable>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>Plano do dia</Text>
                  <Text style={styles.sectionCount}>{completedMealsCount}/{mealList.length} concluídas</Text>
                </View>

                {mealList.map((meal) => {
                  const entry = getMealById(meal.id);
                  if (!entry) return null;
                  const percent = mealProgressPercent(meal.id);
                  return (
                    <View key={meal.id} style={styles.weekCard}>
                      <Pressable style={styles.weekHead} onPress={() => openMealFromWeek(meal.id)}>
                        <View style={styles.weekIcon}>
                          <meal.icon size={18} color="#75846d" />
                        </View>
                        <View style={styles.weekInfo}>
                          <View style={styles.weekTitleRow}>
                            <Text style={styles.weekTitle}>{entry.label}</Text>
                            <Text style={styles.weekTime}>{entry.time}</Text>
                          </View>
                          <Text style={styles.weekProgress}>{weekProgressLabel(meal.id)}</Text>
                        </View>
                        <ChevronRight size={16} color="#a0a49e" />
                      </Pressable>
                      <View style={styles.weekTrack}>
                        <View style={[styles.weekFill, { width: `${percent}%` }]} />
                      </View>
                      <View style={styles.weekFoot}>
                        <Pressable
                          style={styles.weekPhotoBtn}
                          onPress={() => openPhotoPicker(entry)}
                        >
                          <Camera size={14} color="#fff" />
                          <Text style={styles.weekPhotoBtnText}>Tirar foto</Text>
                        </Pressable>
                      </View>
                    </View>
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

      {currentMeal ? (
        <>
          <DietaMealSubstitutionsModal
            open={substitutionsOpen}
            mealId={activeMealId}
            mealLabel={currentMeal.label}
            groups={substitutionGroups}
            onClose={() => setSubstitutionsOpen(false)}
          />

          <DietaAddExtraFoodModal
            open={extraFoodOpen}
            mealLabel={currentMeal.label}
            onClose={() => setExtraFoodOpen(false)}
            onAdded={onExtraFoodAdded}
          />
        </>
      ) : null}

      <DietaMealPlanOptionPickerModal
        open={optionPickerOpen}
        required={optionPickerRequired}
        focusSlotKey={optionPickerFocusSlot}
        title={optionPickerTitle}
        confirmLabel={optionPickerRequired ? 'Continuar' : 'Salvar opção'}
        onClose={() => setOptionPickerOpen(false)}
        onSaved={onOptionSelectionsSaved}
      />

      <DietaMealPlanOptionsIntroModal
        open={optionIntroOpen}
        slotsLabel={optionSlotsLabel}
        onChoose={onOptionIntroChoose}
      />

      <DietaMealPlanRecipeDetailSheet
        open={recipeDetailOpen}
        recipe={selectedRecipe}
        onClose={() => setRecipeDetailOpen(false)}
      />

      <MealPhotoFlow
        meal={photoMeal}
        pickerOpen={photoPickerOpen}
        onPickerClose={() => setPhotoPickerOpen(false)}
        onSaved={() => void loadDailySummary()}
      />
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: spacing[6], gap: spacing[3] },
  tabs: {
    flexDirection: 'row',
    padding: 3,
    backgroundColor: '#f5f6f4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e4e6e2',
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#161c14', shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 },
  tabText: { fontFamily: fonts.medium, fontSize: 13, color: '#777c75' },
  tabTextActive: { fontFamily: fonts.medium, color: '#272a26' },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing[4] },
  sectionTitle: { fontFamily: fonts.medium, fontSize: 17, color: '#20221f' },
  sectionCount: { fontFamily: fonts.regular, fontSize: 11, color: '#7d837a', paddingBottom: 2 },
  optionsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderWidth: 1,
    borderColor: '#d5ddd0',
    borderRadius: 16,
    backgroundColor: '#f3f7f1',
  },
  optionsBannerCopy: { flex: 1 },
  optionsBannerTitle: { fontFamily: fonts.semibold, fontSize: 13, color: '#2d352b' },
  optionsBannerSubtitle: { fontFamily: fonts.regular, fontSize: 11, color: '#6f756d', marginTop: 2, lineHeight: 16 },
  mealsRow: { gap: 8, paddingBottom: 4 },
  mealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingRight: 11,
    paddingLeft: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e4e6e2',
    backgroundColor: '#fff',
  },
  mealBtnActive: { borderColor: '#9aa891', backgroundColor: '#f5f7f3' },
  mealIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: '#f1f3ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealIconWrapActive: { backgroundColor: '#e7ece3' },
  mealBtnText: { fontFamily: fonts.regular, fontSize: 12, color: '#72776f', maxWidth: 100 },
  mealBtnTextActive: { color: '#3f493a' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dfe2dd',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1 },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#f0f3ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadingCopy: { flex: 1 },
  mealLabel: { fontFamily: fonts.medium, fontSize: 15, color: '#20221f' },
  mealMeta: { fontFamily: fonts.regular, fontSize: 11, color: '#858a82', marginTop: 3 },
  cardPercent: { fontFamily: fonts.medium, fontSize: 18, color: '#4f5c49' },
  progressTrack: {
    height: 4,
    marginHorizontal: spacing[4],
    borderRadius: 999,
    backgroundColor: '#eceeeb',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#839678', borderRadius: 999 },
  progress: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#778173',
    marginTop: 7,
    marginBottom: spacing[2],
    paddingHorizontal: spacing[4],
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 56,
    paddingHorizontal: spacing[4],
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eceeeb',
  },
  checkBtn: { padding: 6, margin: -6 },
  itemCopy: { flex: 1, gap: 4 },
  itemText: { fontFamily: fonts.regular, fontSize: 13, color: '#343733', lineHeight: 18 },
  itemDone: { color: '#9a9e98', textDecorationLine: 'line-through' },
  itemSubstituted: { color: '#5f7556' },
  itemExtra: { color: '#806c64' },
  recipeLink: { textDecorationLine: 'underline', textDecorationColor: '#bdc6b8' },
  swapTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#eef3eb',
    color: '#687b60',
    fontFamily: fonts.medium,
    fontSize: 10,
  },
  extraTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#f6f0ed',
    color: '#8a7067',
    fontFamily: fonts.medium,
    fontSize: 10,
  },
  removeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  tools: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  toolBtn: {
    flexGrow: 1,
    flexBasis: '30%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#e2e5e0',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 6,
  },
  toolText: { fontFamily: fonts.regular, fontSize: 11, color: '#60665e', textAlign: 'center' },
  register: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: '#e8eae6',
    backgroundColor: '#f8f9f7',
  },
  registerTitle: { fontFamily: fonts.medium, fontSize: 13, color: '#2b2e2a' },
  registerSubtitle: { fontFamily: fonts.regular, fontSize: 11, color: '#888d85', marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] },
  actionPrimary: {
    flex: 1.35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#798a70',
  },
  actionPrimaryText: { fontFamily: fonts.medium, fontSize: 12, color: '#fff' },
  actionPrimaryFlex: { flex: 1.35 },
  weekPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
  },
  weekPhotoBtnText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#fff',
  },
  actionOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dfe2dd',
    backgroundColor: '#fff',
  },
  actionOutlineText: { fontFamily: fonts.medium, fontSize: 12, color: '#555b53' },
  planLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing[4],
    borderTopWidth: 1,
    borderTopColor: '#e8eae6',
  },
  planLinkText: { fontFamily: fonts.regular, fontSize: 12, color: '#687264' },
  weekCard: {
    borderWidth: 1,
    borderColor: '#e0e3de',
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: spacing[2],
  },
  weekHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
  },
  weekIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#f0f3ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekInfo: { flex: 1 },
  weekTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing[2] },
  weekTitle: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: '#282b27' },
  weekTime: { fontFamily: fonts.regular, fontSize: 11, color: '#8b9089' },
  weekProgress: { fontFamily: fonts.regular, fontSize: 11, color: '#8b9089', marginTop: 3 },
  weekTrack: { height: 3, backgroundColor: '#eceeeb' },
  weekFill: { height: '100%', backgroundColor: '#839678' },
  weekFoot: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    borderTopWidth: 1,
    borderTopColor: '#eceeeb',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: '#eceeeb',
  },
  planSource: { flex: 1, fontFamily: fonts.regular, fontSize: 11, color: '#949891' },
  reupload: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 8 },
  reuploadText: { fontFamily: fonts.medium, fontSize: 11, color: '#6d7b66' },
});
