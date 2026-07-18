import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import CfButton from '@/components/ui/CfButton';
import { useFoodSubstitution } from '@/hooks/useFoodSubstitution';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type FoodItem = { id: string; name: string; category?: string };
type MacroSet = { grams: number; caloriesKcal: number; carbsG: number; proteinG: number; fatG: number };

const CRITERION_OPTIONS = [
  { id: 'calories', label: 'Calorias' },
  { id: 'protein', label: 'Proteína' },
  { id: 'carbs', label: 'Carboidratos' },
  { id: 'fat', label: 'Gordura' },
];

const GROUP_OPTIONS = [
  { id: 'all', label: 'Todos os alimentos' },
  { id: 'protein_rich', label: 'Proteínas' },
  { id: 'carb_rich', label: 'Carboidratos' },
  { id: 'fat_rich', label: 'Gorduras' },
];

function formatMacros(macros: MacroSet) {
  return `${macros.grams} g · ${macros.caloriesKcal} kcal · C ${macros.carbsG} g · P ${macros.proteinG} g · G ${macros.fatG} g`;
}

export default function SubstituicaoScreen() {
  const { searchFoods, calculateSubstitution } = useFoodSubstitution();
  const [mode, setMode] = useState<'multiple' | 'specific'>('multiple');
  const [criterion, setCriterion] = useState('calories');
  const [groupFilter, setGroupFilter] = useState('all');
  const [grams, setGrams] = useState('100');
  const [foodQuery, setFoodQuery] = useState('');
  const [replacementQuery, setReplacementQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [selectedReplacement, setSelectedReplacement] = useState<FoodItem | null>(null);
  const [foodResults, setFoodResults] = useState<FoodItem[]>([]);
  const [replacementResults, setReplacementResults] = useState<FoodItem[]>([]);
  const [result, setResult] = useState<{
    original: { name: string; macros: MacroSet };
    suggestions: Array<{ id: string; name: string; category?: string; similarityPercent: number; macros: MacroSet }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => {
    const gramsNum = Number(grams);
    if (!selectedFood || !gramsNum || gramsNum <= 0) return false;
    if (mode === 'specific' && !selectedReplacement) return false;
    return true;
  }, [grams, mode, selectedFood, selectedReplacement]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setFoodResults(await searchFoods(foodQuery));
      } catch {
        setFoodResults([]);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [foodQuery, searchFoods]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setReplacementResults(await searchFoods(replacementQuery));
      } catch {
        setReplacementResults([]);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [replacementQuery, searchFoods]);

  async function handleCalculate() {
    if (!canSubmit || loading || !selectedFood) return;
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const data = await calculateSubstitution({
        foodId: selectedFood.id,
        grams: Number(grams),
        mode,
        criterion,
        groupFilter,
        replacementId: selectedReplacement?.id,
        limit: 12,
      });
      setResult(data as typeof result);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível calcular as substituições.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PatientShell>
      <PatientHeader title="Substituir alimento" showBack backTo="/dieta" showBell={false} showMenu={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.lead}>
          Encontre substitutos nutricionalmente equivalentes com base na TBCA/TACO.
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Modo de substituição</Text>
          <View style={styles.segmented}>
            <Pressable style={[styles.segment, mode === 'multiple' && styles.segmentActive]} onPress={() => setMode('multiple')}>
              <Text style={[styles.segmentText, mode === 'multiple' && styles.segmentTextActive]}>Ver múltiplas opções</Text>
            </Pressable>
            <Pressable style={[styles.segment, mode === 'specific' && styles.segmentActive]} onPress={() => setMode('specific')}>
              <Text style={[styles.segmentText, mode === 'specific' && styles.segmentTextActive]}>Escolher substituto específico</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Critério de equivalência</Text>
          <View style={styles.chips}>
            {CRITERION_OPTIONS.map((item) => (
              <Pressable key={item.id} style={[styles.chip, criterion === item.id && styles.chipActive]} onPress={() => setCriterion(item.id)}>
                <Text style={[styles.chipText, criterion === item.id && styles.chipTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Alimento de referência</Text>
          <TextInput
            style={styles.input}
            value={foodQuery}
            onChangeText={(text) => { setFoodQuery(text); setSelectedFood(null); }}
            placeholder="Ex.: arroz, branco, cozido"
          />
          {foodResults.length ? (
            <View style={styles.suggestions}>
              {foodResults.map((item) => (
                <Pressable key={item.id} style={styles.suggestionBtn} onPress={() => { setSelectedFood(item); setFoodQuery(item.name); setFoodResults([]); }}>
                  <Text style={styles.suggestionTitle}>{item.name}</Text>
                  {item.category ? <Text style={styles.suggestionMeta}>{item.category}</Text> : null}
                </Pressable>
              ))}
            </View>
          ) : null}
          {selectedFood ? <Text style={styles.selected}>Selecionado: {selectedFood.name}</Text> : null}

          <Text style={styles.label}>Quantidade (g)</Text>
          <TextInput style={styles.input} value={grams} onChangeText={setGrams} keyboardType="numeric" />

          {mode === 'specific' ? (
            <>
              <Text style={styles.label}>Substituto específico</Text>
              <TextInput
                style={styles.input}
                value={replacementQuery}
                onChangeText={(text) => { setReplacementQuery(text); setSelectedReplacement(null); }}
                placeholder="Ex.: batata, inglesa, cozida"
              />
              {replacementResults.length ? (
                <View style={styles.suggestions}>
                  {replacementResults.map((item) => (
                    <Pressable key={item.id} style={styles.suggestionBtn} onPress={() => { setSelectedReplacement(item); setReplacementQuery(item.name); setReplacementResults([]); }}>
                      <Text style={styles.suggestionTitle}>{item.name}</Text>
                      {item.category ? <Text style={styles.suggestionMeta}>{item.category}</Text> : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {selectedReplacement ? <Text style={styles.selected}>Substituto: {selectedReplacement.name}</Text> : null}
            </>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <CfButton label={loading ? 'Calculando...' : 'Ver opções de substituição'} loading={loading} disabled={!canSubmit} onPress={handleCalculate} />
        </View>

        {result ? (
          <View style={styles.results}>
            <Text style={styles.resultsTitle}>Referência</Text>
            <View style={[styles.resultCard, styles.resultOriginal]}>
              <Text style={styles.resultName}>{result.original.name}</Text>
              <Text style={styles.resultMacros}>{formatMacros(result.original.macros)}</Text>
            </View>
            <Text style={styles.resultsTitle}>
              {mode === 'specific' ? 'Equivalência calculada' : 'Opções equivalentes'}
            </Text>
            {!result.suggestions.length ? (
              <Text style={styles.empty}>Nenhuma opção encontrada para os filtros selecionados.</Text>
            ) : null}
            {result.suggestions.map((item, index) => (
              <View key={item.id} style={styles.resultCard}>
                <View style={styles.resultHead}>
                  <Text style={styles.rank}>{index + 1}</Text>
                  <View style={styles.resultCopy}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    {item.category ? <Text style={styles.resultCat}>{item.category}</Text> : null}
                  </View>
                  <Text style={styles.similarity}>{item.similarityPercent}%</Text>
                </View>
                <Text style={styles.resultMacros}>{formatMacros(item.macros)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: spacing[6], gap: spacing[4] },
  lead: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    padding: spacing[4],
    backgroundColor: colors.surface,
    gap: spacing[3],
  },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 14 },
  segmented: { flexDirection: 'row', gap: 6, padding: 4, backgroundColor: colors.track, borderRadius: 10 },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  segmentTextActive: { color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  chipTextActive: { color: colors.primaryDark },
  label: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  suggestions: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.control, overflow: 'hidden' },
  suggestionBtn: { padding: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border },
  suggestionTitle: { fontFamily: fonts.semibold, fontSize: 13 },
  suggestionMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  selected: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  error: { color: colors.error, fontFamily: fonts.medium },
  results: { gap: spacing[3] },
  resultsTitle: { fontFamily: fonts.extrabold, fontSize: 12, color: colors.textMuted, letterSpacing: 0.5 },
  resultCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.control, padding: spacing[3], backgroundColor: colors.surface, gap: 6 },
  resultOriginal: { borderColor: colors.primarySoft },
  resultHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  rank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    color: colors.primaryDark,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  resultCopy: { flex: 1 },
  resultName: { fontFamily: fonts.bold, fontSize: 14 },
  resultCat: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  similarity: { fontFamily: fonts.extrabold, color: colors.primaryDark },
  resultMacros: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  empty: { fontFamily: fonts.regular, color: colors.textMuted },
});
