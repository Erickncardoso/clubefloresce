import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  Share,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Beef, Bookmark, Droplets, Heart, Minus, Plus, Wheat } from 'lucide-react-native';
import MealConfirmHeaderBar from '@/components/bella/MealConfirmHeaderBar';
import MealConfirmMacroGrid from '@/components/bella/MealConfirmMacroGrid';
import MealConfirmMoreMenu from '@/components/bella/MealConfirmMoreMenu';
import MealDishEditSheet from '@/components/bella/MealDishEditSheet';
import MealIngredientEditSheet from '@/components/bella/MealIngredientEditSheet';
import MealWhenAteSheet from '@/components/bella/MealWhenAteSheet';
import { mealConfirmStyles as styles } from '@/components/bella/mealConfirmStyles';
import {
  formatMacro,
  formatMealCapturedAt,
  mealDishTitle,
  mealGramsTotal,
  mealHealthScore,
} from '@/lib/meal-confirm-display';
import { createMealItemId, sumMealItems, type MealDiaryItem } from '@/lib/meal-diary';
import { resolveMediaUrl } from '@/lib/media-url';
import { colors } from '@/theme/tokens';

export type MealDraft = {
  items: MealDiaryItem[];
  totals?: {
    caloriesKcal?: number;
    carbsG?: number;
    proteinG?: number;
    fatG?: number;
  };
  mealType: string;
  mealLabel: string;
  imageUrl?: string;
  userMessageId?: string;
  editingEntryId?: string;
  notes?: string;
};

type Props = {
  open: boolean;
  draft: MealDraft | null;
  saving: boolean;
  error?: string;
  embedded?: boolean;
  photoHeight?: number;
  onCancel: () => void;
  onConfirm: (items: MealDiaryItem[]) => void;
  onCorrect?: () => void;
};

export default function BellaMealConfirmModal({
  open,
  draft,
  saving,
  error = '',
  embedded = false,
  photoHeight,
  onCancel,
  onConfirm,
  onCorrect,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const heroH = photoHeight ?? Math.round(height * 0.48);
  const [items, setItems] = useState<MealDiaryItem[]>([]);
  const [dishTitle, setDishTitle] = useState('');
  const [ateAt, setAteAt] = useState(() => new Date());
  const [whenOpen, setWhenOpen] = useState(false);
  const [editing, setEditing] = useState<MealDiaryItem | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dishEditOpen, setDishEditOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [elevated, setElevated] = useState(false);
  const scrollY = useSharedValue(0);
  const lastElevated = useSharedValue(0);

  useEffect(() => {
    if (!open || !draft) return;
    setItems(
      Array.isArray(draft.items)
        ? draft.items.map((item) => ({ ...item, id: item.id || createMealItemId() }))
        : [],
    );
    setAteAt(new Date());
    setWhenOpen(false);
    setDishTitle('');
    setMenuOpen(false);
    setDishEditOpen(false);
    setBookmarked(false);
    setElevated(false);
    scrollY.value = 0;
    lastElevated.value = 0;
  }, [draft, lastElevated, open, scrollY]);

  const totals = useMemo(() => sumMealItems(items), [items]);
  const grams = mealGramsTotal(items);
  const title = dishTitle || mealDishTitle(items, draft?.mealLabel || 'Sua refeição');
  const capturedAt = formatMealCapturedAt(ateAt);
  const health = mealHealthScore(totals.caloriesKcal, grams, totals.proteinG, totals.fatG);
  const imageUri = draft?.imageUrl ? resolveMediaUrl(draft.imageUrl) : null;

  const fadeDistance = heroH - 36;

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      const next = event.contentOffset.y > fadeDistance * 0.32 ? 1 : 0;
      if (next !== lastElevated.value) {
        lastElevated.value = next;
        runOnJS(setElevated)(next === 1);
      }
    },
  });

  const photoFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, fadeDistance * 0.75], [0, 1], Extrapolation.CLAMP),
  }));

  const headerBgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      scrollY.value,
      [0, fadeDistance * 0.4],
      ['rgba(232,232,234,0)', 'rgb(232,232,234)'],
    ),
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, fadeDistance * 0.4], [1, 0], Extrapolation.CLAMP),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    borderTopLeftRadius: interpolate(scrollY.value, [fadeDistance * 0.7, fadeDistance], [36, 0], Extrapolation.CLAMP),
    borderTopRightRadius: interpolate(scrollY.value, [fadeDistance * 0.7, fadeDistance], [36, 0], Extrapolation.CLAMP),
  }));

  function saveItem(next: MealDiaryItem) {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === next.id);
      if (index < 0) return [...prev, next];
      return prev.map((item, i) => (i === index ? next : item));
    });
    setEditing(null);
  }

  async function shareMeal() {
    try {
      await Share.share({
        title,
        message: `${title}\n${grams} g · ${Math.round(totals.caloriesKcal)} kcal`,
        url: imageUri || undefined,
      });
    } catch {
      // usuário cancelou
    }
  }

  if (!draft) return null;

  const headerPad = { paddingTop: insets.top + 8 };

  const body = (
    <>
      <View style={[styles.screen, embedded && styles.screenEmbedded]}>
        <View style={[styles.hero, { height: heroH }, embedded && styles.heroEmbedded]}>
          {embedded ? null : imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroFallback} />
          )}
          <View style={styles.heroFade} />
          <Animated.View style={[styles.heroCopy, titleStyle]} pointerEvents="none">
            <View style={styles.healthPill}>
              <Heart color="#ff6b6b" size={12} fill="#ff6b6b" strokeWidth={0} />
              <Text style={styles.healthText}>Saudabilidade: {formatMacro(health)} / 10</Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={3}>{title}</Text>
          </Animated.View>
          <Animated.View style={[styles.heroWhite, photoFadeStyle]} pointerEvents="none" />
        </View>

        <Animated.View style={[styles.headerLayer, headerPad, headerBgStyle]} pointerEvents="box-none">
          <MealConfirmHeaderBar
            light={!elevated}
            capturedAt={capturedAt}
            onCancel={onCancel}
            onWhen={() => setWhenOpen(true)}
            onMore={() => setMenuOpen(true)}
          />
        </Animated.View>

        <Animated.ScrollView
          style={styles.scroll}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          bounces
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ paddingTop: heroH - 28, paddingBottom: 20 }}
        >
          <Animated.View style={[styles.sheet, sheetStyle, { minHeight: height - 72 }]}>
            <View style={styles.handle} />
            <View style={styles.body}>
              <MealConfirmMacroGrid
                grams={grams}
                caloriesKcal={totals.caloriesKcal}
                carbsG={totals.carbsG}
                proteinG={totals.proteinG}
                fatG={totals.fatG}
              />

              <Text style={styles.sectionLabel}>Ingredientes</Text>
              {items.map((item, index) => (
                <Pressable
                  key={item.id || `${item.name}-${index}`}
                  style={styles.itemRow}
                  onPress={() => setEditing(item)}
                >
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                      {Math.round(item.grams || 0)} g • {Math.round(item.caloriesKcal || 0)} kcal
                    </Text>
                    <View style={styles.itemMacros}>
                      <Wheat color="#c9842a" size={12} strokeWidth={1.8} />
                      <Text style={styles.itemMacro}>{formatMacro(item.carbsG || 0)}</Text>
                      <Beef color="#c45c4a" size={12} strokeWidth={1.8} />
                      <Text style={styles.itemMacro}>{formatMacro(item.proteinG || 0)}</Text>
                      <Droplets color="#5a9a4a" size={12} strokeWidth={1.8} />
                      <Text style={styles.itemMacro}>{formatMacro(item.fatG || 0)}</Text>
                    </View>
                  </View>
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                    accessibilityLabel={`Remover ${item.name}`}
                  >
                    <Minus color={colors.textMuted} size={16} strokeWidth={2.2} />
                  </Pressable>
                </Pressable>
              ))}

              <Pressable
                style={styles.addBtn}
                onPress={() => setEditing({
                  id: createMealItemId(),
                  name: '',
                  grams: 100,
                  caloriesKcal: 0,
                  carbsG: 0,
                  proteinG: 0,
                  fatG: 0,
                  source: 'manual',
                })}
              >
                <Plus color={colors.text} size={16} />
                <Text style={styles.addText}>Adicionar novo ingrediente</Text>
              </Pressable>

              <Text style={styles.hint}>
                Quer melhorar o resultado? Toque em “Corrigir resultado” e conte pra gente!
              </Text>
              <Pressable
                style={styles.correctBtn}
                disabled={saving}
                onPress={onCorrect || onCancel}
              >
                <Text style={styles.correctText}>Corrigir resultado</Text>
              </Pressable>

              {draft.notes ? <Text style={styles.notes}>{draft.notes}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          </Animated.View>
        </Animated.ScrollView>

        <View style={[styles.footer, { paddingBottom: 12 }]}>
          <Pressable
            style={[styles.confirmBtn, (saving || items.length === 0) && styles.confirmDisabled]}
            disabled={saving || items.length === 0}
            onPress={() => onConfirm(items)}
          >
            <Text style={styles.confirmText}>
              {saving ? 'Salvando...' : 'Registrar alimento'}
            </Text>
          </Pressable>
          <Pressable
            style={styles.bookmarkBtn}
            onPress={() => setBookmarked((value) => !value)}
            accessibilityLabel={bookmarked ? 'Remover dos salvos' : 'Salvar refeição'}
          >
            <Bookmark
              color="#fff"
              size={20}
              fill={bookmarked ? '#fff' : 'transparent'}
              strokeWidth={1.8}
            />
          </Pressable>
        </View>
      </View>

      <MealIngredientEditSheet
        item={editing}
        onClose={() => setEditing(null)}
        onSave={saveItem}
      />
      <MealDishEditSheet
        open={dishEditOpen}
        title={title}
        items={items}
        onClose={() => setDishEditOpen(false)}
        onSave={({ title: nextTitle, items: nextItems }) => {
          setDishTitle(nextTitle);
          setItems(nextItems);
          setDishEditOpen(false);
        }}
      />
      <MealWhenAteSheet
        open={whenOpen}
        value={ateAt}
        onClose={() => setWhenOpen(false)}
        onConfirm={(next) => {
          setAteAt(next);
          setWhenOpen(false);
        }}
      />
      <MealConfirmMoreMenu
        open={menuOpen}
        top={insets.top + 52}
        onClose={() => setMenuOpen(false)}
        onEdit={() => setTimeout(() => setDishEditOpen(true), 280)}
        onShare={shareMeal}
      />
    </>
  );

  if (embedded) return body;

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onCancel}>
      {body}
    </Modal>
  );
}
