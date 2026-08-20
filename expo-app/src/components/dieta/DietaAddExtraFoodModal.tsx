import { useEffect, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { Check, ChevronRight, Sparkles, Utensils } from 'lucide-react-native';
import AppleBottomSheet, { useBottomSheetDismiss } from '@/components/ui/AppleBottomSheet';
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
import {
  EXTRA_QUANTITY_UNITS,
  defaultExtraQuantityForUnit,
  formatExtraItemLabel,
} from '@/lib/meal-extra-quantity';
import { formatFoodDisplayLabel, formatPer100gKcal } from '@/lib/food-bank';
import { triggerImpactHaptic } from '@/lib/picker-haptics';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FoodItem = {
  id: string;
  name: string;
  displayName?: string;
  per100g?: { caloriesKcal?: number };
};

type Props = {
  open: boolean;
  mealLabel: string;
  onClose: () => void;
  onAdded: (payload: { food: FoodItem; amount: number; unit: string }) => void;
};

function SheetBody({
  mealLabel,
  onAdded,
}: Omit<Props, 'open' | 'onClose'>) {
  const { dismiss } = useBottomSheetDismiss();
  const { searchFoods } = useFoodSubstitution();
  const [foodQuery, setFoodQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('unidade');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const stepIndex = selectedFood ? 1 : 0;

  const previewLabel = useMemo(() => {
    if (!selectedFood) return '';
    const qty = Number(amount);
    if (!Number.isFinite(qty) || qty <= 0) return '';
    return formatExtraItemLabel(formatFoodDisplayLabel(selectedFood), qty, unit);
  }, [amount, selectedFood, unit]);

  const canSubmit = useMemo(() => {
    if (!selectedFood) return false;
    const qty = Number(amount);
    return Number.isFinite(qty) && qty > 0;
  }, [amount, selectedFood]);

  function resetForm() {
    setFoodQuery('');
    setSelectedFood(null);
    setAmount('');
    setUnit('unidade');
    setError('');
    setResults([]);
    setSearching(false);
  }

  function applyDefaultQuantity(food: FoodItem, unitId = unit) {
    const defaults = defaultExtraQuantityForUnit(food.name, unitId);
    setAmount(String(defaults.amount));
    setUnit(defaults.unit);
  }

  function selectFood(food: FoodItem) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    triggerImpactHaptic();
    setSelectedFood(food);
    setFoodQuery(formatFoodDisplayLabel(food));
    setResults([]);
    applyDefaultQuantity(food, unit);
    setError('');
  }

  function clearSelection() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    triggerImpactHaptic();
    setSelectedFood(null);
    setAmount('');
    setError('');
  }

  useEffect(() => {
    resetForm();
  }, []);

  useEffect(() => {
    const query = foodQuery.trim();
    const selectedLabel = selectedFood ? formatFoodDisplayLabel(selectedFood) : '';
    if (!query || (selectedFood && query === selectedLabel)) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        setResults(await searchFoods(query) as FoodItem[]);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [foodQuery, searchFoods, selectedFood]);

  function submit() {
    if (!canSubmit || !selectedFood) {
      setError('Selecione um alimento e informe a quantidade.');
      return;
    }
    triggerImpactHaptic();
    onAdded({
      food: {
        ...selectedFood,
        name: formatFoodDisplayLabel(selectedFood),
      },
      amount: Number(amount),
      unit,
    });
    resetForm();
    dismiss();
  }

  return (
    <View style={styles.root}>
      <DietaSheetHeader
        icon={Utensils}
        title="Adicionar alimento"
        subtitle={mealLabel}
        badge="Fora do plano"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <DietaSheetSteps steps={['Alimento', 'Porção']} activeIndex={stepIndex} />

        <Text style={styles.lead}>
          {stepIndex === 0
            ? 'Busque o que você comeu a mais nesta refeição.'
            : 'Ajuste a quantidade — você pode mudar depois no diário.'}
        </Text>

        <DietaSheetSearch
          value={foodQuery}
          onChange={(value) => {
            setFoodQuery(value);
            if (selectedFood && value !== formatFoodDisplayLabel(selectedFood)) {
              setSelectedFood(null);
              setAmount('');
            }
          }}
          loading={searching}
        />

        {results.length > 0 && !selectedFood ? (
          <DietaGroupedList>
            {results.map((food, index) => (
              <View key={food.id}>
                {index > 0 ? <DietaGroupedDivider /> : null}
                <Pressable
                  style={({ pressed }) => [styles.resultRow, pressed && styles.rowPressed]}
                  onPress={() => selectFood(food)}
                >
                  <View style={styles.resultCopy}>
                    <Text style={styles.resultTitle}>{formatFoodDisplayLabel(food)}</Text>
                    {food.per100g?.caloriesKcal ? (
                      <Text style={styles.resultMeta}>
                        {formatPer100gKcal(food.per100g.caloriesKcal)} kcal / 100 g
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={16} color="#c7c7cc" />
                </Pressable>
              </View>
            ))}
          </DietaGroupedList>
        ) : null}

        {!selectedFood && foodQuery.trim().length > 1 && !searching && results.length === 0 ? (
          <Text style={styles.emptyHint}>Nenhum alimento encontrado. Tente outro nome.</Text>
        ) : null}

        {selectedFood ? (
          <View style={styles.selectedBlock}>
            <Pressable style={styles.selectedCard} onPress={clearSelection}>
              <View style={styles.selectedIcon}>
                <Check size={16} color={colors.primaryDark} strokeWidth={2.5} />
              </View>
              <View style={styles.selectedCopy}>
                <Text style={styles.selectedName}>{formatFoodDisplayLabel(selectedFood)}</Text>
                {selectedFood.per100g?.caloriesKcal ? (
                  <Text style={styles.selectedMeta}>
                    {formatPer100gKcal(selectedFood.per100g.caloriesKcal)} kcal a cada 100 g
                  </Text>
                ) : null}
              </View>
              <Text style={styles.changeLink}>Trocar</Text>
            </Pressable>

            <Text style={styles.fieldLabel}>Quantidade</Text>
            <DietaQuantityStepper value={amount} onChange={setAmount} />

            <Text style={styles.fieldLabel}>Unidade</Text>
            <View style={styles.unitGrid}>
              {EXTRA_QUANTITY_UNITS.map((option) => {
                const active = unit === option.id;
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.unitChip, active && styles.unitChipActive]}
                    onPress={() => {
                      triggerImpactHaptic();
                      setUnit(option.id);
                      applyDefaultQuantity(selectedFood, option.id);
                    }}
                  >
                    <Text style={[styles.unitChipText, active && styles.unitChipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {previewLabel ? (
          <View style={styles.preview}>
            <View style={styles.previewIcon}>
              <Sparkles size={16} color={colors.primaryDark} />
            </View>
            <View style={styles.previewCopy}>
              <Text style={styles.previewLabel}>Será adicionado à refeição</Text>
              <Text style={styles.previewValue}>{previewLabel}</Text>
            </View>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.foot, { paddingBottom: spacing[2] }]}>
        <DietaSheetPrimaryButton
          label={canSubmit ? 'Adicionar à refeição' : 'Escolha alimento e quantidade'}
          sublabel={canSubmit ? previewLabel : undefined}
          disabled={!canSubmit}
          onPress={submit}
        />
      </View>
    </View>
  );
}

export default function DietaAddExtraFoodModal({ open, mealLabel, onClose, onAdded }: Props) {
  return (
    <AppleBottomSheet
      visible={open}
      onClose={onClose}
      maxHeightRatio={0.84}
      contentPadding={0}
      topRadius={28}
      fillHeight
    >
      {open ? (
        <SheetBody mealLabel={mealLabel} onAdded={onAdded} />
      ) : null}
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
  emptyHint: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing[3],
  },
  selectedBlock: {
    marginBottom: spacing[2],
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
    marginBottom: spacing[4],
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
  selectedName: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  selectedMeta: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.primaryDark,
  },
  changeLink: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  unitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing[3],
  },
  unitChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: '#f2f2f7',
  },
  unitChipActive: {
    backgroundColor: colors.primary,
  },
  unitChipText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  unitChipTextActive: {
    color: '#fff',
    fontFamily: fonts.semibold,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radii.control,
    backgroundColor: '#fafafa',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginBottom: spacing[2],
  },
  previewIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCopy: { flex: 1 },
  previewLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  previewValue: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
    marginTop: 4,
    lineHeight: 20,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#b42318',
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  foot: {
    paddingHorizontal: DIETA_SHEET_GUTTER,
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e5ea',
    backgroundColor: '#fff',
  },
});
