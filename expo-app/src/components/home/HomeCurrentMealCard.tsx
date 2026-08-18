import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Camera } from 'lucide-react-native';
import MealPhotoFlow from '@/components/diario/MealPhotoFlow';
import { usePatientMealPlan } from '@/hooks/usePatientMealPlan';
import { countDone, loadChecked } from '@/lib/dieta-progress';
import { splitMealItemDisplay } from '@/lib/meal-item-display';
import { getMealById } from '@/lib/meal-plan-api';
import { getMealIdForTimeFromMeals } from '@/lib/meal-plan-time';
import { colors, fonts, radii } from '@/theme/tokens';

type Props = {
  mealId?: string;
  maxItems?: number;
  readOnly?: boolean;
  onPhotoSaved?: () => void;
};

type DisplayItem = {
  name: string;
  detail: string;
  portion: string;
  isSubstituted: boolean;
};

function normalizeQuantityText(value = '') {
  let text = String(value)
    .replace(/([A-Za-zÀ-ÿ])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-zÀ-ÿ])/g, '$1 $2')
    .replace(/(\d+)\s*Unidade\(s\)/gi, (_, count) => `${count} ${Number(count) === 1 ? 'unidade' : 'unidades'}`)
    .replace(/(\d+)\s*Filé\(s\)/gi, (_, count) => `${count} ${Number(count) === 1 ? 'filé' : 'filés'}`)
    .replace(/(\d+)\s*colher\(es\)/gi, (_, count) => `${count} ${Number(count) === 1 ? 'colher' : 'colheres'}`);

  const singular = /\b1\s+(unidade|filé|colher)\b/i.test(text);
  text = text
    .replace(/médio\(s\)/gi, singular ? 'médio' : 'médios')
    .replace(/cheia\(s\)/gi, singular ? 'cheia' : 'cheias');

  return text.replace(/\s+/g, ' ').trim();
}

function formatDisplayItem(source: string, isSubstituted = false): DisplayItem {
  const parsed = splitMealItemDisplay(source);
  const normalizedName = normalizeQuantityText(parsed.name);
  const quantityStart = normalizedName.search(/\s\d+\s/);

  if (quantityStart < 0) {
    return { ...parsed, name: normalizedName, detail: '', isSubstituted };
  }

  return {
    ...parsed,
    name: normalizedName.slice(0, quantityStart).trim(),
    detail: normalizedName.slice(quantityStart).trim(),
    isSubstituted,
  };
}

export default function HomeCurrentMealCard({
  mealId = '',
  maxItems = 4,
  readOnly = false,
  onPhotoSaved,
}: Props) {
  const { meals } = usePatientMealPlan();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [itemsProgress, setItemsProgress] = useState(0);
  const [progressText, setProgressText] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const meal = useMemo(() => {
    if (!meals.length) return null;
    if (mealId) return getMealById(meals, mealId);
    const currentId = getMealIdForTimeFromMeals(meals, now);
    return (currentId ? getMealById(meals, currentId) : null) ?? meals[0] ?? null;
  }, [mealId, meals, now]);

  const displayItems = useMemo(() => {
    if (!meal?.items?.length) {
      return (meal?.itemLabels || []).map((label) => formatDisplayItem(label));
    }
    return meal.items.map((item) =>
      formatDisplayItem(String(item.display || item.name || ''), Boolean(item.isSubstituted)),
    );
  }, [meal]);

  const totalItems = displayItems.length;
  const visibleItems = displayItems.slice(0, maxItems);
  const hiddenCount = Math.max(0, displayItems.length - maxItems);

  useEffect(() => {
    if (!meal?.items?.length) {
      setItemsProgress(0);
      setProgressText('');
      return;
    }
    void (async () => {
      const states = await loadChecked(meal.id, meal.items.length);
      const done = countDone(states);
      if (!done) {
        setItemsProgress(0);
        setProgressText('');
        return;
      }
      const pct = Math.round((done / meal.items.length) * 100);
      setItemsProgress(pct);
      if (done === meal.items.length) setProgressText('Concluída');
      else setProgressText(`${done}/${meal.items.length}`);
    })();
  }, [meal]);

  if (!meal) return null;

  const MealIcon = meal.icon;
  const dietaHref = `/dieta?meal=${meal.id}` as const;

  function takePhoto() {
    setPickerOpen(true);
  }

  const tappableBody = (
    <>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <MealIcon color={colors.primaryDark} size={18} strokeWidth={2} />
        </View>
        <View style={styles.titleWrap}>
          <View style={styles.context}>
            <Text style={styles.status}>Agora</Text>
            <Text style={styles.time}>{meal.time || ''}</Text>
          </View>
          <Text style={styles.title}>{meal.label}</Text>
          <Text style={styles.meta}>
            Refeição {meal.index} de {meal.total}
            {totalItems ? ` · ${totalItems} ${totalItems === 1 ? 'item' : 'itens'}` : ''}
          </Text>
        </View>
      </View>

      {itemsProgress > 0 ? (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack} accessibilityRole="progressbar">
            <View style={[styles.progressFill, { width: `${itemsProgress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{progressText}</Text>
        </View>
      ) : null}

      <View style={styles.items}>
        {visibleItems.map((item, index) => (
          <View key={`${meal.id}-${index}`} style={styles.item}>
            <View style={styles.itemBody}>
              <Text
                style={[styles.itemName, item.isSubstituted && styles.itemNameSub]}
                numberOfLines={2}
              >
                {item.name}
              </Text>
              {item.detail ? <Text style={styles.itemDetail}>{item.detail}</Text> : null}
              {item.isSubstituted ? <Text style={styles.itemTag}>Substituído</Text> : null}
            </View>
            {item.portion ? <Text style={styles.itemPortion}>{item.portion}</Text> : null}
          </View>
        ))}
      </View>

      {hiddenCount > 0 ? (
        <Text style={styles.more}>
          + {hiddenCount} {hiddenCount === 1 ? 'item' : 'itens'}
        </Text>
      ) : null}
    </>
  );

  if (readOnly) {
    return <View style={styles.card}>{tappableBody}</View>;
  }

  return (
    <View style={styles.card}>
      <Link href={dietaHref as never} asChild>
        <Pressable style={styles.tapArea} accessibilityRole="button">
          {tappableBody}
        </Pressable>
      </Link>
      <View style={styles.foot}>
        <Pressable style={styles.photoBtn} onPress={takePhoto}>
          <Camera size={15} color="#fff" strokeWidth={2} />
          <Text style={styles.photoBtnText}>Tirar foto</Text>
        </Pressable>
      </View>
      <MealPhotoFlow
        meal={meal}
        pickerOpen={pickerOpen}
        onPickerClose={() => setPickerOpen(false)}
        onSaved={onPhotoSaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: radii.surface,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  tapArea: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 14 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { flex: 1, minWidth: 0 },
  context: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  status: { fontFamily: fonts.medium, fontSize: 10, color: colors.primaryDark },
  time: { fontFamily: fonts.medium, fontSize: 12, color: '#596251' },
  title: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text, letterSpacing: -0.3 },
  meta: { marginTop: 3, fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  progressTrack: { flex: 1, height: 4, borderRadius: 999, backgroundColor: colors.track, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.primary },
  progressLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.primaryDark },
  items: { gap: 0 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 55,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60, 60, 67, 0.1)',
  },
  itemBody: { flex: 1, minWidth: 0, gap: 2 },
  itemName: { fontFamily: fonts.regular, fontSize: 13, color: colors.text, lineHeight: 17 },
  itemNameSub: { color: colors.primaryDark },
  itemDetail: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  itemTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    fontFamily: fonts.medium,
    fontSize: 9,
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemPortion: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
    fontFamily: fonts.medium,
    fontSize: 11,
    color: '#596251',
    backgroundColor: '#f1f3ed',
  },
  more: { marginTop: 6, paddingLeft: 17, fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  foot: {
    marginTop: 4,
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(60, 60, 67, 0.1)',
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
  },
  photoBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: '#fff',
  },
});
