import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Beef, Droplets, Wheat, X } from 'lucide-react-native';
import AppleBottomSheet from '@/components/ui/AppleBottomSheet';
import { formatMacro, rescaleMealItem } from '@/lib/meal-confirm-display';
import type { MealDiaryItem } from '@/lib/meal-diary';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = {
  item: MealDiaryItem | null;
  onClose: () => void;
  onSave: (item: MealDiaryItem) => void;
};

function num(value: string) {
  return Number(String(value).replace(',', '.')) || 0;
}

export default function MealIngredientEditSheet({ item, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [grams, setGrams] = useState('0');
  const [kcal, setKcal] = useState('0');
  const [carbs, setCarbs] = useState('0');
  const [protein, setProtein] = useState('0');
  const [fat, setFat] = useState('0');
  const [aiMode, setAiMode] = useState(true);
  const [base, setBase] = useState<MealDiaryItem | null>(null);

  useEffect(() => {
    if (!item) return;
    setName(item.name || '');
    setGrams(String(Math.round(item.grams || 0)));
    setKcal(String(Math.round(item.caloriesKcal || 0)));
    setCarbs(formatMacro(item.carbsG || 0));
    setProtein(formatMacro(item.proteinG || 0));
    setFat(formatMacro(item.fatG || 0));
    setAiMode(true);
    setBase(item);
  }, [item]);

  function applyGrams(nextGrams: string) {
    setGrams(nextGrams);
    if (!aiMode || !base) return;
    const scaled = rescaleMealItem(base, num(nextGrams) || 1);
    setKcal(String(scaled.caloriesKcal || 0));
    setCarbs(formatMacro(scaled.carbsG || 0));
    setProtein(formatMacro(scaled.proteinG || 0));
    setFat(formatMacro(scaled.fatG || 0));
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
      source: aiMode ? item.source || 'ai' : 'manual',
    });
  }

  return (
    <AppleBottomSheet
      visible={Boolean(item)}
      onClose={onClose}
      maxHeightRatio={0.86}
      contentPadding={20}
      topRadius={36}
    >
      <View style={styles.head}>
        <View style={{ width: 36 }} />
        <Pressable style={styles.close} onPress={onClose} accessibilityLabel="Fechar">
          <X color={colors.text} size={16} />
        </Pressable>
      </View>
      <TextInput
        value={name}
        onChangeText={setName}
        style={styles.title}
        placeholder="Alimento"
        placeholderTextColor={colors.placeholder}
      />
      <Text style={styles.hint}>Toque no nome para editar</Text>

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
          <Text style={styles.toggleTitle}>Detalhamento da Bella</Text>
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

      <Pressable style={styles.save} onPress={handleSave}>
        <Text style={styles.saveText}>Salvar</Text>
      </Pressable>
    </AppleBottomSheet>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.text,
    padding: 0,
  },
  hint: {
    marginTop: 4,
    marginBottom: 22,
    fontFamily: fonts.regular,
    fontSize: 14,
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
  saveText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#fff',
  },
});
