import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, Plus, Utensils, X } from 'lucide-react-native';
import { useFoodSubstitution } from '@/hooks/useFoodSubstitution';
import {
  EXTRA_QUANTITY_UNITS,
  defaultExtraQuantityForUnit,
  formatExtraItemLabel,
} from '@/lib/meal-extra-quantity';
import { formatPer100gKcal } from '@/lib/food-bank';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type FoodItem = {
  id: string;
  name: string;
  per100g?: { caloriesKcal?: number };
};

type Props = {
  open: boolean;
  mealLabel: string;
  onClose: () => void;
  onAdded: (payload: { food: FoodItem; amount: number; unit: string }) => void;
};

export default function DietaAddExtraFoodModal({ open, mealLabel, onClose, onAdded }: Props) {
  const { searchFoods } = useFoodSubstitution();
  const [foodQuery, setFoodQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('unidade');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [error, setError] = useState('');

  const previewLabel = useMemo(() => {
    if (!selectedFood) return '';
    const qty = Number(amount);
    if (!Number.isFinite(qty) || qty <= 0) return '';
    return formatExtraItemLabel(selectedFood.name, qty, unit);
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
  }

  function applyDefaultQuantity(food: FoodItem, unitId = unit) {
    const defaults = defaultExtraQuantityForUnit(food.name, unitId);
    setAmount(String(defaults.amount));
    setUnit(defaults.unit);
  }

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      try {
        setResults(await searchFoods(foodQuery) as FoodItem[]);
      } catch {
        setResults([]);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [foodQuery, open, searchFoods]);

  function submit() {
    if (!canSubmit || !selectedFood) {
      setError('Selecione um alimento e informe a quantidade.');
      return;
    }

    onAdded({
      food: selectedFood,
      amount: Number(amount),
      unit,
    });
    resetForm();
    onClose();
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.head}>
          <View style={styles.titleWrap}>
            <View style={styles.titleIcon}>
              <Utensils size={18} color="#718069" />
            </View>
            <View style={styles.titleCopy}>
              <Text style={styles.title}>Adicionar alimento</Text>
              <Text style={styles.meal}>{mealLabel}</Text>
            </View>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>Busque o alimento consumido e ajuste a quantidade.</Text>

          <Text style={styles.fieldLabel}>Qual alimento você consumiu?</Text>
          <TextInput
            value={foodQuery}
            onChangeText={(value) => {
              setFoodQuery(value);
              setSelectedFood(null);
            }}
            placeholder="Busque por nome…"
            style={styles.input}
          />

          {results.length > 0 && !selectedFood ? (
            <View style={styles.results}>
              {results.map((food) => (
                <Pressable
                  key={food.id}
                  style={styles.resultRow}
                  onPress={() => {
                    setSelectedFood(food);
                    setFoodQuery(food.name);
                    applyDefaultQuantity(food, unit);
                  }}
                >
                  <Text style={styles.resultText}>{food.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {selectedFood ? (
            <View style={styles.selected}>
              <View style={styles.selectedCheck}>
                <Check size={14} color="#62775a" />
              </View>
              <View style={styles.selectedCopy}>
                <Text style={styles.selectedName}>{selectedFood.name}</Text>
                {selectedFood.per100g?.caloriesKcal ? (
                  <Text style={styles.selectedMeta}>
                    {formatPer100gKcal(selectedFood.per100g.caloriesKcal)} kcal a cada 100 g
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {selectedFood ? (
            <View style={styles.row}>
              <View style={styles.rowGrow}>
                <Text style={styles.fieldLabel}>Quantidade</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>
              <View style={styles.rowUnit}>
                <Text style={styles.fieldLabel}>Unidade</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitRow}>
                  {EXTRA_QUANTITY_UNITS.map((option) => (
                    <Pressable
                      key={option.id}
                      style={[styles.unitChip, unit === option.id && styles.unitChipActive]}
                      onPress={() => {
                        setUnit(option.id);
                        applyDefaultQuantity(selectedFood, option.id);
                      }}
                    >
                      <Text style={[styles.unitChipText, unit === option.id && styles.unitChipTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          ) : null}

          {previewLabel ? (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Será adicionado</Text>
              <Text style={styles.previewValue}>{previewLabel}</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.foot}>
          <Pressable style={[styles.submit, !canSubmit && styles.submitDisabled]} disabled={!canSubmit} onPress={submit}>
            <Plus size={15} color="#fff" />
            <Text style={styles.submitText}>Adicionar à refeição</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(21,24,20,0.38)' },
  sheet: {
    maxHeight: '82%',
    backgroundColor: '#fff',
    borderTopLeftRadius: radii.surface,
    borderTopRightRadius: radii.surface,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[6],
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.track,
    marginVertical: spacing[2],
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 },
  titleIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#f0f3ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCopy: { flex: 1 },
  title: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  meal: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f2f3f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flexGrow: 0 },
  intro: { fontFamily: fonts.regular, fontSize: 12, color: '#686d66', marginBottom: spacing[3], lineHeight: 18 },
  fieldLabel: { fontFamily: fonts.medium, fontSize: 12, color: '#393c38', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#dfe2dd',
    borderRadius: 12,
    paddingHorizontal: spacing[3],
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing[3],
  },
  results: {
    borderWidth: 1,
    borderColor: '#e2e5e0',
    borderRadius: 12,
    marginBottom: spacing[3],
    overflow: 'hidden',
  },
  resultRow: { paddingHorizontal: spacing[3], paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eceeeb' },
  resultText: { fontFamily: fonts.regular, fontSize: 13, color: colors.text },
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderWidth: 1,
    borderColor: '#e1e6de',
    borderRadius: 12,
    backgroundColor: '#f7f9f6',
    marginBottom: spacing[3],
  },
  selectedCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dfe9da',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCopy: { flex: 1 },
  selectedName: { fontFamily: fonts.medium, fontSize: 12, color: '#30332f' },
  selectedMeta: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted, marginTop: 2 },
  row: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[3] },
  rowGrow: { flex: 1 },
  rowUnit: { flex: 1 },
  unitRow: { gap: 6, paddingBottom: 4 },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  unitChipActive: { borderColor: '#77886e', backgroundColor: '#f3f7f1' },
  unitChipText: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  unitChipTextActive: { color: '#4f5c49', fontFamily: fonts.medium },
  preview: { padding: spacing[3], borderRadius: 12, backgroundColor: '#f5f6f4', marginBottom: spacing[3] },
  previewLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  previewValue: { fontFamily: fonts.medium, fontSize: 12, color: colors.text, marginTop: 2 },
  error: { fontFamily: fonts.regular, fontSize: 12, color: '#b42318', marginBottom: spacing[2] },
  foot: { borderTopWidth: 1, borderTopColor: '#eceeeb', paddingTop: spacing[3], marginTop: spacing[2] },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#77886e',
  },
  submitDisabled: { backgroundColor: '#e2e4e0' },
  submitText: { fontFamily: fonts.semibold, fontSize: 14, color: '#fff' },
});
