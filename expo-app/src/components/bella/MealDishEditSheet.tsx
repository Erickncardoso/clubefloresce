import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { Beef, Droplets, Wheat } from 'lucide-react-native';
import AppleBottomSheet from '@/components/ui/AppleBottomSheet';
import { mealDishEditStyles as styles } from '@/components/bella/mealDishEditStyles';
import {
  applyMealTotalsToItems,
  formatMacro,
  mealGramsTotal,
} from '@/lib/meal-confirm-display';
import { sumMealItems, type MealDiaryItem } from '@/lib/meal-diary';
import { colors } from '@/theme/tokens';

type Props = {
  open: boolean;
  title: string;
  items: MealDiaryItem[];
  onClose: () => void;
  onSave: (next: { title: string; items: MealDiaryItem[] }) => void;
};

function num(value: string) {
  return Number(String(value).replace(',', '.')) || 0;
}

export default function MealDishEditSheet({ open, title, items, onClose, onSave }: Props) {
  const [name, setName] = useState(title);
  const [unit, setUnit] = useState<'grams' | 'portion'>('grams');
  const [grams, setGrams] = useState('0');
  const [portion, setPortion] = useState('1');
  const [baseGrams, setBaseGrams] = useState(1);
  const [kcal, setKcal] = useState('0');
  const [carbs, setCarbs] = useState('0');
  const [protein, setProtein] = useState('0');
  const [fat, setFat] = useState('0');
  const [aiMode, setAiMode] = useState(true);
  const [baseItems, setBaseItems] = useState<MealDiaryItem[]>([]);

  useEffect(() => {
    if (!open) return;
    const totals = sumMealItems(items);
    const totalGrams = Math.max(1, mealGramsTotal(items));
    setName(title);
    setUnit('grams');
    setGrams(String(totalGrams));
    setPortion('1');
    setBaseGrams(totalGrams);
    setKcal(String(Math.round(totals.caloriesKcal)));
    setCarbs(formatMacro(totals.carbsG));
    setProtein(formatMacro(totals.proteinG));
    setFat(formatMacro(totals.fatG));
    setAiMode(true);
    setBaseItems(items.map((item) => ({ ...item })));
  }, [items, open, title]);

  function syncFromGrams(nextGrams: number) {
    if (!aiMode || !baseItems.length) return;
    const scaled = applyMealTotalsToItems(baseItems, {
      grams: nextGrams,
      caloriesKcal: 0,
      carbsG: 0,
      proteinG: 0,
      fatG: 0,
      rescaleOnly: true,
    });
    const totals = sumMealItems(scaled);
    setKcal(String(Math.round(totals.caloriesKcal)));
    setCarbs(formatMacro(totals.carbsG));
    setProtein(formatMacro(totals.proteinG));
    setFat(formatMacro(totals.fatG));
  }

  function applyQuantity(value: string) {
    if (unit === 'grams') {
      setGrams(value);
      syncFromGrams(Math.max(1, num(value) || 1));
      return;
    }
    setPortion(value);
    const parts = Math.max(0.1, num(value) || 1);
    syncFromGrams(Math.max(1, Math.round(baseGrams * parts)));
  }

  function handleSave() {
    const nextGrams = unit === 'grams'
      ? Math.max(1, Math.round(num(grams) || 1))
      : Math.max(1, Math.round(baseGrams * Math.max(0.1, num(portion) || 1)));
    onSave({
      title: name.trim() || title,
      items: applyMealTotalsToItems(baseItems, {
        grams: nextGrams,
        caloriesKcal: Math.max(0, Math.round(num(kcal))),
        carbsG: Math.round(num(carbs) * 10) / 10,
        proteinG: Math.round(num(protein) * 10) / 10,
        fatG: Math.round(num(fat) * 10) / 10,
        rescaleOnly: aiMode,
      }),
    });
  }

  return (
    <AppleBottomSheet visible={open} onClose={onClose} maxHeightRatio={0.9} contentPadding={20} topRadius={36} fillHeight>
      <TextInput
        value={name}
        onChangeText={setName}
        style={styles.title}
        placeholder="Refeição"
        placeholderTextColor={colors.placeholder}
      />
      <Text style={styles.hint}>Toque no nome para editar</Text>

      <Text style={styles.label}>Quantidade consumida</Text>
      <View style={styles.qtyRow}>
        <View style={styles.segment}>
          <Pressable
            style={[styles.segBtn, unit === 'grams' && styles.segOn]}
            onPress={() => {
              setUnit('grams');
              setGrams(String(Math.max(1, Math.round(baseGrams * Math.max(0.1, num(portion) || 1)))));
            }}
          >
            <Text style={[styles.segText, unit === 'grams' && styles.segTextOn]}>Gramas</Text>
          </Pressable>
          <Pressable
            style={[styles.segBtn, unit === 'portion' && styles.segOn]}
            onPress={() => {
              setUnit('portion');
              setBaseGrams(Math.max(1, num(grams) || baseGrams));
              setPortion('1');
            }}
          >
            <Text style={[styles.segText, unit === 'portion' && styles.segTextOn]}>Porção</Text>
          </Pressable>
        </View>
        <View style={styles.boxWrap}>
          <TextInput
            value={unit === 'grams' ? grams : portion}
            onChangeText={applyQuantity}
            keyboardType="decimal-pad"
            style={styles.boxInput}
          />
          <Text style={styles.boxUnit}>{unit === 'grams' ? 'g' : ''}</Text>
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
      <MacroRow icon={<Wheat color="#c9842a" size={16} />} label="Carboidratos" value={carbs} onChange={setCarbs} locked={aiMode} />
      <MacroRow icon={<Beef color="#c45c4a" size={16} />} label="Proteína" value={protein} onChange={setProtein} locked={aiMode} />
      <MacroRow icon={<Droplets color={colors.primaryDark} size={16} />} label="Gordura" value={fat} onChange={setFat} locked={aiMode} />

      <Pressable style={styles.save} onPress={handleSave}>
        <Text style={styles.saveText}>Salvar</Text>
      </Pressable>
    </AppleBottomSheet>
  );
}

function MacroRow({
  icon,
  label,
  value,
  onChange,
  locked,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  locked: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.macroName}>
        {icon}
        <Text style={styles.label}>{label}</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={!locked}
        keyboardType="decimal-pad"
        style={[styles.box, locked && styles.boxMuted]}
      />
    </View>
  );
}