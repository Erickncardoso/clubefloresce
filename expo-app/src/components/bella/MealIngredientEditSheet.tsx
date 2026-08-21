import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Beef, Droplets, Search, Wheat } from 'lucide-react-native';
import AppleBottomSheet from '@/components/ui/AppleBottomSheet';
import { useFoodSubstitution } from '@/hooks/useFoodSubstitution';
import { formatFoodDisplayLabel, formatPer100gKcal, macrosForFoodRecord } from '@/lib/food-bank';
import { formatMacro, rescaleMealItem } from '@/lib/meal-confirm-display';
import type { MealDiaryItem } from '@/lib/meal-diary';
import { triggerImpactHaptic } from '@/lib/picker-haptics';
import { colors, fonts, radii } from '@/theme/tokens';

type FoodHit = {
  id: string;
  name: string;
  displayName?: string;
  source?: string;
  per100g?: {
    caloriesKcal?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
  };
};

type Props = {
  item: MealDiaryItem | null;
  onClose: () => void;
  onSave: (item: MealDiaryItem) => void;
};

function num(value: string) {
  return Number(String(value).replace(',', '.')) || 0;
}

export default function MealIngredientEditSheet({ item, onClose, onSave }: Props) {
  const { searchFoods } = useFoodSubstitution();
  const [name, setName] = useState('');
  const [grams, setGrams] = useState('100');
  const [kcal, setKcal] = useState('0');
  const [carbs, setCarbs] = useState('0');
  const [protein, setProtein] = useState('0');
  const [fat, setFat] = useState('0');
  const [foodId, setFoodId] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState(true);
  const [base, setBase] = useState<MealDiaryItem | null>(null);
  const [results, setResults] = useState<FoodHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!item) return;
    setName(item.name || '');
    setGrams(String(Math.round(item.grams || 100)));
    setKcal(String(Math.round(item.caloriesKcal || 0)));
    setCarbs(formatMacro(item.carbsG || 0));
    setProtein(formatMacro(item.proteinG || 0));
    setFat(formatMacro(item.fatG || 0));
    setFoodId(item.foodId || null);
    setAiMode(true);
    setBase(item);
    setResults([]);
    setShowResults(!item.name?.trim());
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const query = name.trim();
    if (query.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const hits = await searchFoods(query, 10) as FoodHit[];
        if (!cancelled) {
          setResults(hits);
          setShowResults(true);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [item, name, searchFoods]);

  function applyGrams(nextGrams: string) {
    setGrams(nextGrams);
    if (!aiMode || !base) return;
    const scaled = rescaleMealItem(base, num(nextGrams) || 1);
    setKcal(String(scaled.caloriesKcal || 0));
    setCarbs(formatMacro(scaled.carbsG || 0));
    setProtein(formatMacro(scaled.proteinG || 0));
    setFat(formatMacro(scaled.fatG || 0));
  }

  function selectFood(food: FoodHit) {
    triggerImpactHaptic();
    const nextGrams = Math.max(1, Math.round(num(grams) || 100));
    const macros = macrosForFoodRecord(food, nextGrams);
    const label = formatFoodDisplayLabel(food);
    const next: MealDiaryItem = {
      ...(item || { name: label }),
      id: item?.id,
      name: label,
      grams: nextGrams,
      caloriesKcal: macros.caloriesKcal,
      carbsG: macros.carbsG,
      proteinG: macros.proteinG,
      fatG: macros.fatG,
      foodId: food.id,
      source: 'food_bank',
      originalName: item?.originalName || item?.name || null,
    };
    setName(label);
    setFoodId(food.id);
    setGrams(String(nextGrams));
    setKcal(String(macros.caloriesKcal));
    setCarbs(formatMacro(macros.carbsG));
    setProtein(formatMacro(macros.proteinG));
    setFat(formatMacro(macros.fatG));
    setBase(next);
    setAiMode(true);
    setShowResults(false);
    setResults([]);
  }

  function handleSave() {
    if (!item) return;
    onSave({
      ...item,
      name: name.trim() || item.name || 'Alimento',
      grams: Math.max(1, Math.round(num(grams) || 1)),
      caloriesKcal: Math.max(0, Math.round(num(kcal))),
      carbsG: Math.round(num(carbs) * 10) / 10,
      proteinG: Math.round(num(protein) * 10) / 10,
      fatG: Math.round(num(fat) * 10) / 10,
      foodId: foodId || item.foodId || null,
      source: foodId
        ? 'food_bank'
        : aiMode
          ? item.source || 'ai'
          : 'manual',
    });
  }

  const isNew = Boolean(item && !item.name?.trim());

  return (
    <AppleBottomSheet
      visible={Boolean(item)}
      onClose={onClose}
      maxHeightRatio={0.9}
      contentPadding={20}
      topRadius={36}
    >
      <Text style={styles.sheetTitle}>
        {isNew ? 'Adicionar ingrediente' : 'Editar ingrediente'}
      </Text>
      <Text style={styles.hint}>
        Digite o nome e escolha na base TBCA/TACO — os macros vêm preenchidos. Dá pra ajustar depois.
      </Text>

      <View style={styles.searchWrap}>
        <Search color={colors.textMuted} size={16} strokeWidth={2} />
        <TextInput
          value={name}
          onChangeText={(value) => {
            setName(value);
            setFoodId(null);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          style={styles.searchInput}
          placeholder="Ex.: arroz branco cozido"
          placeholderTextColor={colors.placeholder}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searching ? <ActivityIndicator size="small" color={colors.primaryDark} /> : null}
      </View>

      {showResults && (searching || results.length > 0 || name.trim().length >= 2) ? (
        <View style={styles.resultsCard}>
          {searching && !results.length ? (
            <Text style={styles.resultsEmpty}>Buscando na base…</Text>
          ) : null}
          {!searching && name.trim().length >= 2 && !results.length ? (
            <Text style={styles.resultsEmpty}>Nenhum alimento encontrado. Preencha na mão se quiser.</Text>
          ) : null}
          <ScrollView style={styles.resultsList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {results.map((food) => (
              <Pressable
                key={food.id}
                style={styles.resultRow}
                onPress={() => selectFood(food)}
              >
                <Text style={styles.resultName} numberOfLines={2}>
                  {formatFoodDisplayLabel(food)}
                </Text>
                <Text style={styles.resultMeta}>
                  {formatPer100gKcal(Number(food.per100g?.caloriesKcal) || 0)} kcal / 100 g
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.row}>
        <Text style={styles.label}>Quantidade consumida</Text>
        <View style={styles.boxWrap}>
          <TextInput
            value={grams}
            onChangeText={applyGrams}
            keyboardType="decimal-pad"
            style={styles.boxInput}
          />
          <Text style={styles.boxUnit}>g</Text>
        </View>
      </View>

      <View style={styles.toggleCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>
            {foodId ? 'Valores da base de alimentos' : 'Detalhamento da Bella'}
          </Text>
          <Text style={styles.toggleSub}>Desligue para inserir valores na mão</Text>
        </View>
        <Switch
          value={aiMode}
          onValueChange={setAiMode}
          trackColor={{ false: '#e5e5ea', true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Calorias</Text>
        <TextInput
          value={kcal}
          onChangeText={setKcal}
          editable={!aiMode}
          keyboardType="decimal-pad"
          style={[styles.box, aiMode && styles.boxMuted]}
        />
      </View>

      <Text style={styles.section}>Macronutrientes</Text>
      <View style={styles.row}>
        <View style={styles.macroName}>
          <Wheat color="#c9842a" size={16} />
          <Text style={styles.label}>Carboidratos</Text>
        </View>
        <TextInput
          value={carbs}
          onChangeText={setCarbs}
          editable={!aiMode}
          keyboardType="decimal-pad"
          style={[styles.box, aiMode && styles.boxMuted]}
        />
      </View>
      <View style={styles.row}>
        <View style={styles.macroName}>
          <Beef color="#c45c4a" size={16} />
          <Text style={styles.label}>Proteína</Text>
        </View>
        <TextInput
          value={protein}
          onChangeText={setProtein}
          editable={!aiMode}
          keyboardType="decimal-pad"
          style={[styles.box, aiMode && styles.boxMuted]}
        />
      </View>
      <View style={styles.row}>
        <View style={styles.macroName}>
          <Droplets color={colors.primaryDark} size={16} />
          <Text style={styles.label}>Gordura</Text>
        </View>
        <TextInput
          value={fat}
          onChangeText={setFat}
          editable={!aiMode}
          keyboardType="decimal-pad"
          style={[styles.box, aiMode && styles.boxMuted]}
        />
      </View>

      <Pressable
        style={[styles.save, !name.trim() && styles.saveDisabled]}
        disabled={!name.trim()}
        onPress={handleSave}
      >
        <Text style={styles.saveText}>Salvar</Text>
      </Pressable>
    </AppleBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
  },
  hint: {
    marginTop: 6,
    marginBottom: 16,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: radii.control,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
  },
  resultsCard: {
    maxHeight: 180,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: radii.control,
    backgroundColor: '#fafafa',
    overflow: 'hidden',
  },
  resultsList: {
    maxHeight: 180,
  },
  resultsEmpty: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  resultRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5ea',
  },
  resultName: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  resultMeta: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },
  boxWrap: {
    minWidth: 92,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: radii.control,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  boxInput: {
    minWidth: 40,
    padding: 0,
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
  },
  boxUnit: {
    marginLeft: 2,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textMuted,
  },
  box: {
    minWidth: 92,
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: radii.control,
    paddingHorizontal: 12,
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#fff',
  },
  boxMuted: {
    color: colors.textMuted,
    backgroundColor: '#fafafa',
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 16,
    borderRadius: radii.control,
    backgroundColor: '#f4f4f2',
  },
  toggleTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  toggleSub: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  section: {
    marginBottom: 12,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  macroName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  save: {
    marginTop: 8,
    minHeight: 52,
    borderRadius: radii.control,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDisabled: {
    opacity: 0.45,
  },
  saveText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#fff',
  },
});
