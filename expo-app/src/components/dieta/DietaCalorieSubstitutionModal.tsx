import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { ArrowDown, Calculator, Check, ChevronRight, Scale } from 'lucide-react-native';
import AppleBottomSheet from '@/components/ui/AppleBottomSheet';
import {
  DietaGroupedDivider,
  DietaGroupedList,
  DietaQuantityStepper,
  DietaSheetHeader,
  DietaSheetPrimaryButton,
  DietaSheetSearch,
  DietaSheetSteps,
  DIETA_SHEET_GUTTER,
} from '@/components/dieta/DietaSheetUi';
import { useFoodSubstitution } from '@/hooks/useFoodSubstitution';
import { formatFoodDisplayLabel, formatPer100gKcal } from '@/lib/food-bank';
import { triggerImpactHaptic } from '@/lib/picker-haptics';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const SUGGESTIONS_FETCH_LIMIT = 24;
const SUGGESTIONS_INITIAL_VISIBLE = 4;
const SUGGESTIONS_VISIBLE_STEP = 5;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FoodItem = {
  id: string;
  name: string;
  displayName?: string;
  category?: string;
  per100g?: { caloriesKcal?: number };
};

type MacroSet = {
  grams: number;
  caloriesKcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
};

type SubstitutionResult = {
  original: { name: string; macros: MacroSet };
  suggestions: SuggestionItem[];
};

type SuggestionItem = {
  id: string;
  name: string;
  category?: string | null;
  macros: MacroSet;
  similarityPercent?: number;
  per100g?: { caloriesKcal?: number };
};

type Props = {
  open: boolean;
  mealLabel?: string;
  onClose: () => void;
};

function formatMacros(macros: MacroSet) {
  return `${macros.grams} g · ${macros.caloriesKcal} kcal · C ${macros.carbsG} g · P ${macros.proteinG} g · G ${macros.fatG} g`;
}

function SuggestionRow({
  suggestion,
  selected,
  onPress,
}: {
  suggestion: SuggestionItem;
  selected: boolean;
  onPress: () => void;
}) {
  const label = formatFoodDisplayLabel(suggestion);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.suggestionRow,
        selected && styles.suggestionRowSelected,
        pressed && styles.rowPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.resultCopy}>
        <Text style={[styles.resultTitle, selected && styles.suggestionTitleSelected]}>{label}</Text>
        <Text style={styles.suggestionMeta}>
          <Text style={styles.suggestionGrams}>{suggestion.macros.grams} g</Text>
          {' · '}
          {suggestion.macros.caloriesKcal} kcal
          {suggestion.similarityPercent != null ? ` · ${Math.round(suggestion.similarityPercent)}% match` : ''}
        </Text>
      </View>
      <ChevronRight size={16} color={selected ? colors.primaryDark : '#c7c7cc'} />
    </Pressable>
  );
}

function FoodResultRow({ food, onPress }: { food: FoodItem; onPress: () => void }) {
  const label = formatFoodDisplayLabel(food);
  return (
    <Pressable
      style={({ pressed }) => [styles.resultRow, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <View style={styles.resultCopy}>
        <Text style={styles.resultTitle}>{label}</Text>
        {food.per100g?.caloriesKcal ? (
          <Text style={styles.resultMeta}>
            {formatPer100gKcal(food.per100g.caloriesKcal)} kcal / 100 g
            {food.category ? ` · ${food.category}` : ''}
          </Text>
        ) : food.category ? (
          <Text style={styles.resultMeta}>{food.category}</Text>
        ) : null}
      </View>
      <ChevronRight size={16} color="#c7c7cc" />
    </Pressable>
  );
}

function SelectedFoodCard({
  label,
  kicker,
  onChange,
}: {
  label: string;
  kicker: string;
  onChange: () => void;
}) {
  return (
    <Pressable style={styles.selectedCard} onPress={onChange}>
      <View style={styles.selectedIcon}>
        <Check size={16} color={colors.primaryDark} strokeWidth={2.5} />
      </View>
      <View style={styles.selectedCopy}>
        <Text style={styles.selectedKicker}>{kicker}</Text>
        <Text style={styles.selectedName}>{label}</Text>
      </View>
      <Text style={styles.changeLink}>Trocar</Text>
    </Pressable>
  );
}

function SheetBody({ mealLabel }: { mealLabel: string }) {
  const { searchFoods, calculateSubstitution } = useFoodSubstitution();

  const [foodQuery, setFoodQuery] = useState('');
  const [replacementQuery, setReplacementQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [selectedReplacement, setSelectedReplacement] = useState<FoodItem | null>(null);
  const [foodResults, setFoodResults] = useState<FoodItem[]>([]);
  const [replacementResults, setReplacementResults] = useState<FoodItem[]>([]);
  const [foodSearching, setFoodSearching] = useState(false);
  const [replacementSearching, setReplacementSearching] = useState(false);
  const [grams, setGrams] = useState('100');
  const [result, setResult] = useState<SubstitutionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoSuggestions, setAutoSuggestions] = useState<SuggestionItem[]>([]);
  const [visibleSuggestionCount, setVisibleSuggestionCount] = useState(SUGGESTIONS_INITIAL_VISIBLE);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const cachedOriginalRef = useRef<SubstitutionResult['original'] | null>(null);

  const gramsNum = Number(grams);
  const gramsValid = Number.isFinite(gramsNum) && gramsNum >= 1;
  const sameFoodSelected = Boolean(
    selectedFood && selectedReplacement && selectedFood.id === selectedReplacement.id,
  );

  const stepIndex = useMemo(() => {
    if (result) return 3;
    if (selectedReplacement && gramsValid) return 2;
    if (selectedFood && gramsValid) return 1;
    return 0;
  }, [gramsValid, result, selectedFood, selectedReplacement]);

  const canCalculate = Boolean(
    selectedFood
    && selectedReplacement
    && gramsValid
    && !sameFoodSelected
    && !loading,
  );

  const swap = result?.suggestions?.[0] ?? null;
  const originalLabel = selectedFood ? formatFoodDisplayLabel(selectedFood) : '';
  const replacementLabel = selectedReplacement ? formatFoodDisplayLabel(selectedReplacement) : '';
  const visibleSuggestions = autoSuggestions.slice(0, visibleSuggestionCount);
  const hiddenSuggestionCount = Math.max(0, autoSuggestions.length - visibleSuggestionCount);

  function resetSubstituteState() {
    setSelectedReplacement(null);
    setReplacementQuery('');
    setReplacementResults([]);
    setAutoSuggestions([]);
    setVisibleSuggestionCount(SUGGESTIONS_INITIAL_VISIBLE);
    setResult(null);
    cachedOriginalRef.current = null;
  }

  function resetForm() {
    setFoodQuery('');
    resetSubstituteState();
    setSelectedFood(null);
    setFoodResults([]);
    setFoodSearching(false);
    setReplacementSearching(false);
    setSuggestionsLoading(false);
    setGrams('100');
    setLoading(false);
    setError('');
  }

  function onGramsChange(value: string) {
    setGrams(value);
    resetSubstituteState();
    setError('');
  }

  function selectFood(food: FoodItem) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    triggerImpactHaptic();
    setSelectedFood(food);
    setFoodQuery(formatFoodDisplayLabel(food));
    setFoodResults([]);
    resetSubstituteState();
    setError('');
  }

  function selectReplacement(food: FoodItem) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    triggerImpactHaptic();
    setSelectedReplacement(food);
    setReplacementQuery(formatFoodDisplayLabel(food));
    setReplacementResults([]);
    setResult(null);
    setError('');
  }

  function pickAutoSuggestion(suggestion: SuggestionItem) {
    if (!cachedOriginalRef.current) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    triggerImpactHaptic();
    const food: FoodItem = {
      id: suggestion.id,
      name: suggestion.name,
      category: suggestion.category ?? undefined,
      per100g: suggestion.per100g,
    };
    setSelectedReplacement(food);
    setReplacementQuery(formatFoodDisplayLabel(food));
    setReplacementResults([]);
    setResult({
      original: cachedOriginalRef.current,
      suggestions: [suggestion],
    });
    setError('');
  }

  function clearFood() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    triggerImpactHaptic();
    setSelectedFood(null);
    setFoodQuery('');
    resetSubstituteState();
    setError('');
  }

  function clearReplacement() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    triggerImpactHaptic();
    setSelectedReplacement(null);
    setReplacementQuery('');
    setResult(null);
    setError('');
  }

  useEffect(() => {
    resetForm();
  }, []);

  useEffect(() => {
    const query = foodQuery.trim();
    const selectedLabel = selectedFood ? formatFoodDisplayLabel(selectedFood) : '';
    if (!query || (selectedFood && query === selectedLabel)) {
      setFoodResults([]);
      setFoodSearching(false);
      return;
    }
    setFoodSearching(true);
    const timer = setTimeout(async () => {
      try {
        setFoodResults(await searchFoods(query) as FoodItem[]);
      } catch {
        setFoodResults([]);
      } finally {
        setFoodSearching(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [foodQuery, searchFoods, selectedFood]);

  useEffect(() => {
    const query = replacementQuery.trim();
    const selectedLabel = selectedReplacement ? formatFoodDisplayLabel(selectedReplacement) : '';
    if (!query || (selectedReplacement && query === selectedLabel)) {
      setReplacementResults([]);
      setReplacementSearching(false);
      return;
    }
    setReplacementSearching(true);
    const timer = setTimeout(async () => {
      try {
        setReplacementResults(await searchFoods(query) as FoodItem[]);
      } catch {
        setReplacementResults([]);
      } finally {
        setReplacementSearching(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [replacementQuery, searchFoods, selectedReplacement]);

  useEffect(() => {
    if (!selectedFood || !gramsValid || result) {
      setAutoSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    let cancelled = false;
    cachedOriginalRef.current = null;
    setAutoSuggestions([]);
    setVisibleSuggestionCount(SUGGESTIONS_INITIAL_VISIBLE);

    const timer = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const data = await calculateSubstitution({
          foodId: selectedFood.id,
          grams: Math.round(gramsNum),
          mode: 'multiple',
          criterion: 'calories',
          groupFilter: 'all',
          limit: SUGGESTIONS_FETCH_LIMIT,
          mealLabel,
        }) as SubstitutionResult | null;

        if (cancelled || !data) {
          if (!cancelled) setAutoSuggestions([]);
          return;
        }

        cachedOriginalRef.current = data.original;
        setAutoSuggestions(
          (data.suggestions || []).filter((item) => item.id !== selectedFood.id),
        );
        setVisibleSuggestionCount(SUGGESTIONS_INITIAL_VISIBLE);
      } catch {
        if (!cancelled) setAutoSuggestions([]);
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [calculateSubstitution, gramsNum, gramsValid, result, selectedFood]);

  function showMoreSuggestions() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    triggerImpactHaptic();
    setVisibleSuggestionCount((current) =>
      Math.min(autoSuggestions.length, current + SUGGESTIONS_VISIBLE_STEP),
    );
  }

  async function handleCalculate() {
    if (!canCalculate || !selectedFood || !selectedReplacement) return;
    setError('');
    setLoading(true);
    setResult(null);
    triggerImpactHaptic();

    try {
      const data = await calculateSubstitution({
        foodId: selectedFood.id,
        grams: Math.round(gramsNum),
        mode: 'specific',
        criterion: 'calories',
        groupFilter: 'all',
        replacementId: selectedReplacement.id,
        limit: 1,
        mealLabel,
      }) as SubstitutionResult | null;

      if (!data) {
        setError('Alimento não encontrado na base de alimentos.');
        return;
      }

      if (!data.suggestions?.length) {
        setError(
          'Essa troca não faz sentido no mesmo tipo de alimento (ex.: cereal com cereal). Escolha outro substituto.',
        );
        return;
      }

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setResult(data);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível calcular a substituição.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <DietaSheetHeader
        icon={Calculator}
        title="Calcular troca"
        subtitle={mealLabel}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <DietaSheetSteps steps={['Mudar', 'Porção', 'Substituto', 'Resultado']} activeIndex={stepIndex} />

        <Text style={styles.lead}>
          Escolha o que gostaria de mudar e por qual alimento trocar — calculamos a porção equivalente em calorias, no mesmo tipo de alimento.
        </Text>

        {!result ? (
          <>
            <Text style={styles.fieldLabel}>Alimento que gostaria de mudar</Text>
            {selectedFood ? (
              <SelectedFoodCard
                kicker="Você quer mudar"
                label={originalLabel}
                onChange={clearFood}
              />
            ) : (
              <>
                <DietaSheetSearch
                  value={foodQuery}
                  onChange={setFoodQuery}
                  placeholder="Ex.: arroz branco cozido"
                  loading={foodSearching}
                />
                {foodResults.length > 0 ? (
                  <DietaGroupedList>
                    {foodResults.map((food, index) => (
                      <View key={food.id}>
                        {index > 0 ? <DietaGroupedDivider /> : null}
                        <FoodResultRow food={food} onPress={() => selectFood(food)} />
                      </View>
                    ))}
                  </DietaGroupedList>
                ) : null}
                {foodQuery.trim().length > 1 && !foodSearching && foodResults.length === 0 ? (
                  <Text style={styles.emptyHint}>Nenhum alimento na base. Tente outro nome.</Text>
                ) : null}
              </>
            )}

            {selectedFood ? (
              <>
                <Text style={styles.fieldLabel}>Quantidade a mudar (g)</Text>
                <DietaQuantityStepper
                  value={grams}
                  onChange={onGramsChange}
                  step={5}
                  min={1}
                  integer
                />
                {!gramsValid ? (
                  <Text style={styles.emptyHint}>Informe pelo menos 1 g.</Text>
                ) : null}
              </>
            ) : null}

            {selectedFood && gramsValid ? (
              <>
                <View style={styles.dividerRow}>
                  <ArrowDown size={16} color={colors.textMuted} />
                  <Text style={styles.dividerText}>Trocar por</Text>
                </View>

                {selectedReplacement && !result ? (
                  <SelectedFoodCard
                    kicker="Substituto"
                    label={replacementLabel}
                    onChange={clearReplacement}
                  />
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>Sugestões equivalentes</Text>
                    {suggestionsLoading ? (
                      <View style={styles.suggestionsLoading}>
                        <ActivityIndicator size="small" color={colors.primaryDark} />
                        <Text style={styles.suggestionsLoadingText}>Calculando equivalências…</Text>
                      </View>
                    ) : null}

                    {!suggestionsLoading && visibleSuggestions.length > 0 ? (
                      <DietaGroupedList>
                        {visibleSuggestions.map((suggestion, index) => (
                          <View key={suggestion.id}>
                            {index > 0 ? <DietaGroupedDivider /> : null}
                            <SuggestionRow
                              suggestion={suggestion}
                              selected={selectedReplacement?.id === suggestion.id}
                              onPress={() => pickAutoSuggestion(suggestion)}
                            />
                          </View>
                        ))}
                      </DietaGroupedList>
                    ) : null}

                    {!suggestionsLoading && hiddenSuggestionCount > 0 ? (
                      <Pressable style={styles.moreBtn} onPress={showMoreSuggestions}>
                        <Text style={styles.moreBtnText}>
                          Ver mais opções ({hiddenSuggestionCount})
                        </Text>
                      </Pressable>
                    ) : null}

                    {!suggestionsLoading && autoSuggestions.length === 0 && selectedFood ? (
                      <Text style={styles.emptyHint}>Nenhuma sugestão automática para esta porção.</Text>
                    ) : null}

                    <Text style={styles.orSearchLabel}>Ou busque outro alimento</Text>
                    <DietaSheetSearch
                      value={replacementQuery}
                      onChange={(value) => {
                        setReplacementQuery(value);
                        if (selectedReplacement && value !== formatFoodDisplayLabel(selectedReplacement)) {
                          setSelectedReplacement(null);
                          setResult(null);
                        }
                      }}
                      placeholder="Ex.: batata inglesa cozida"
                      loading={replacementSearching}
                    />
                    {replacementResults.length > 0 ? (
                      <DietaGroupedList>
                        {replacementResults.map((food, index) => (
                          <View key={food.id}>
                            {index > 0 ? <DietaGroupedDivider /> : null}
                            <FoodResultRow food={food} onPress={() => selectReplacement(food)} />
                          </View>
                        ))}
                      </DietaGroupedList>
                    ) : null}
                    {replacementQuery.trim().length > 1 && !replacementSearching && replacementResults.length === 0 ? (
                      <Text style={styles.emptyHint}>Nenhum substituto encontrado.</Text>
                    ) : null}
                  </>
                )}

                {sameFoodSelected ? (
                  <Text style={styles.error}>Escolha um alimento diferente do original.</Text>
                ) : null}
              </>
            ) : null}
          </>
        ) : (
          <View style={styles.results}>
            <View style={[styles.resultCard, styles.resultOriginal]}>
              <Text style={styles.resultKicker}>Você quer mudar</Text>
              <Text style={styles.resultName}>{originalLabel}</Text>
              <Text style={styles.resultMacros}>{formatMacros(result.original.macros)}</Text>
            </View>

            <View style={styles.resultArrow}>
              <Scale size={18} color={colors.primaryDark} />
              <Text style={styles.resultArrowText}>Mesma energia (kcal)</Text>
            </View>

            {swap ? (
              <View style={[styles.resultCard, styles.resultSwap]}>
                <Text style={styles.resultKicker}>Equivalente em calorias</Text>
                <Text style={styles.resultName}>{replacementLabel}</Text>
                <Text style={styles.resultHighlight}>
                  Use <Text style={styles.resultStrong}>{swap.macros.grams} g</Text>
                  {' '}para ficar com{' '}
                  <Text style={styles.resultStrong}>{swap.macros.caloriesKcal} kcal</Text>
                  {' '}(mesma energia do alimento original).
                </Text>
                <Text style={styles.resultMacros}>{formatMacros(swap.macros)}</Text>
              </View>
            ) : (
              <Text style={styles.emptyHint}>
                Não encontramos equivalência no mesmo tipo de alimento. Tente outro substituto (ex.: cereal por cereal).
              </Text>
            )}

            <Pressable
              style={styles.resetBtn}
              onPress={() => {
                triggerImpactHaptic();
                resetSubstituteState();
                setError('');
              }}
            >
              <Text style={styles.resetBtnText}>Calcular outra troca</Text>
            </Pressable>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.foot, { paddingBottom: spacing[2] }]}>
        {!result ? (
          <DietaSheetPrimaryButton
            label={loading ? 'Calculando…' : 'Calcular troca em kcal'}
            sublabel={
              loading
                ? 'Calculando equivalências…'
                : canCalculate
                  ? `${originalLabel} → ${replacementLabel}`
                  : 'Selecione os dois alimentos e a quantidade'
            }
            disabled={!canCalculate}
            onPress={handleCalculate}
          />
        ) : null}
      </View>
    </View>
  );
}

export default function DietaCalorieSubstitutionModal({
  open,
  mealLabel = 'Calculadora',
  onClose,
}: Props) {
  return (
    <AppleBottomSheet
      visible={open}
      onClose={onClose}
      maxHeightRatio={0.9}
      contentPadding={0}
      topRadius={28}
      fillHeight
    >
      {open ? <SheetBody mealLabel={mealLabel} /> : null}
    </AppleBottomSheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: {
    paddingHorizontal: DIETA_SHEET_GUTTER,
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  lead: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing[4],
    textAlign: 'center',
    paddingHorizontal: spacing[2],
  },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: spacing[2],
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minHeight: 54,
    paddingHorizontal: spacing[4],
    paddingVertical: 10,
  },
  rowPressed: { backgroundColor: '#e8e8ed' },
  resultCopy: { flex: 1, minWidth: 0 },
  resultTitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  resultMeta: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minHeight: 58,
    paddingHorizontal: spacing[4],
    paddingVertical: 12,
  },
  suggestionRowSelected: {
    backgroundColor: 'rgba(111, 120, 99, 0.1)',
  },
  suggestionTitleSelected: {
    fontFamily: fonts.semibold,
    color: colors.primaryDark,
  },
  suggestionMeta: {
    marginTop: 3,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  suggestionGrams: {
    fontFamily: fonts.semibold,
    color: colors.primaryDark,
  },
  suggestionsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing[3],
  },
  suggestionsLoadingText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  orSearchLabel: {
    marginTop: spacing[3],
    marginBottom: 8,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  moreBtn: {
    alignSelf: 'center',
    marginBottom: spacing[2],
    paddingVertical: 10,
    paddingHorizontal: spacing[4],
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  moreBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.primaryDark,
  },
  emptyHint: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginVertical: spacing[2],
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radii.surface,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#dfe6d8',
    marginBottom: spacing[2],
  },
  selectedIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCopy: { flex: 1, minWidth: 0 },
  selectedKicker: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  selectedName: {
    marginTop: 2,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  changeLink: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: spacing[3],
  },
  dividerText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  results: { gap: spacing[3], marginTop: spacing[1] },
  resultCard: {
    borderRadius: radii.surface,
    padding: spacing[4],
    borderWidth: 1,
  },
  resultOriginal: {
    backgroundColor: '#fafafa',
    borderColor: '#ececec',
  },
  resultSwap: {
    backgroundColor: colors.primarySoft,
    borderColor: '#dfe6d8',
  },
  resultKicker: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  resultName: {
    marginTop: 4,
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },
  resultHighlight: {
    marginTop: spacing[2],
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.primaryDark,
    lineHeight: 21,
  },
  resultStrong: {
    fontFamily: fonts.bold,
    color: colors.text,
  },
  resultMacros: {
    marginTop: spacing[2],
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  resultArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resultArrowText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primaryDark,
  },
  resetBtn: {
    alignSelf: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  resetBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.primaryDark,
  },
  error: {
    marginTop: spacing[2],
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#b54a4a',
    textAlign: 'center',
  },
  foot: {
    paddingHorizontal: DIETA_SHEET_GUTTER,
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e5ea',
    backgroundColor: '#fff',
  },
});
