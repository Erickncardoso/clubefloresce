import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import {
  normalizeMealItemsForSave,
  sumMealItems,
  type MealDiaryItem,
} from '@/lib/meal-diary';
import { resolveMediaUrl } from '@/lib/media-url';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

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
  onCancel: () => void;
  onConfirm: (items: MealDiaryItem[]) => void;
};

function scaleItems(items: MealDiaryItem[], servings: number): MealDiaryItem[] {
  if (servings === 1) return items;
  return items.map((item) => ({
    ...item,
    grams: Math.max(1, Math.round((item.grams || 1) * servings)),
    caloriesKcal: Math.max(0, Math.round((item.caloriesKcal || 0) * servings)),
    carbsG: Math.round(((item.carbsG || 0) * servings) * 10) / 10,
    proteinG: Math.round(((item.proteinG || 0) * servings) * 10) / 10,
    fatG: Math.round(((item.fatG || 0) * servings) * 10) / 10,
  }));
}

export default function BellaMealConfirmModal({
  open,
  draft,
  saving,
  error = '',
  onCancel,
  onConfirm,
}: Props) {
  const [items, setItems] = useState<MealDiaryItem[]>([]);
  const [servings, setServings] = useState('1');

  useEffect(() => {
    if (!open || !draft) return;
    setItems(Array.isArray(draft.items) ? draft.items.map((item) => ({ ...item })) : []);
    setServings('1');
  }, [draft, open]);

  const scaledItems = useMemo(() => {
    const qty = Math.max(0.5, Number(servings) || 1);
    return scaleItems(items, qty);
  }, [items, servings]);

  const totals = useMemo(() => sumMealItems(scaledItems), [scaledItems]);

  function updateItemName(index: number, name: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, name } : item)));
  }

  function handleConfirm() {
    onConfirm(normalizeMealItemsForSave(scaledItems));
  }

  if (!draft) return null;

  const imageUri = draft.imageUrl ? resolveMediaUrl(draft.imageUrl) : null;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.head}>
          <View style={styles.headCopy}>
            <Text style={styles.kicker}>{draft.mealLabel || 'Refeição'}</Text>
            <Text style={styles.title}>Confirmar prato</Text>
          </View>
          <Pressable onPress={onCancel} hitSlop={8} style={styles.closeBtn}>
            <X color={colors.textMuted} size={18} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.photo} resizeMode="cover" />
          ) : null}

          <View style={styles.servingsRow}>
            <Text style={styles.servingsLabel}>Porção(ões)</Text>
            <TextInput
              value={servings}
              onChangeText={setServings}
              keyboardType="decimal-pad"
              style={styles.servingsInput}
            />
          </View>

          <Text style={styles.sectionLabel}>Ingredientes detectados</Text>
          {items.map((item, index) => (
            <View key={item.id || `${item.name}-${index}`} style={styles.itemRow}>
              <TextInput
                value={item.name}
                onChangeText={(value) => updateItemName(index, value)}
                style={styles.itemName}
              />
              <Text style={styles.itemMeta}>
                {Math.round(item.grams || 0)}g · {Math.round(item.caloriesKcal || 0)} kcal
              </Text>
            </View>
          ))}

          <View style={styles.totals}>
            <Text style={styles.totalsLabel}>Total estimado</Text>
            <Text style={styles.totalsValue}>
              {Math.round(totals.caloriesKcal)} kcal · C {totals.carbsG}g · P {totals.proteinG}g · G {totals.fatG}g
            </Text>
          </View>

          {draft.notes ? <Text style={styles.notes}>{draft.notes}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} disabled={saving} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
          <Pressable
            style={[styles.confirmBtn, saving && styles.confirmBtnDisabled]}
            disabled={saving || scaledItems.length === 0}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmText}>{saving ? 'Salvando...' : 'Registrar no diário'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,20,20,0.42)',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.surface,
    borderTopRightRadius: radii.surface,
    paddingBottom: spacing[6],
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.track,
    marginTop: spacing[2],
    marginBottom: spacing[3],
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    marginBottom: spacing[3],
  },
  headCopy: { flex: 1 },
  kicker: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: radii.control,
    backgroundColor: colors.track,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  servingsLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  servingsInput: {
    minWidth: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontFamily: fonts.medium,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  sectionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  itemRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    padding: spacing[3],
    backgroundColor: '#fff',
    gap: 4,
  },
  itemName: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
    padding: 0,
  },
  itemMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  totals: {
    borderRadius: radii.control,
    backgroundColor: colors.primarySoft,
    padding: spacing[3],
    gap: 4,
  },
  totalsLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  totalsValue: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  notes: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.error },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
  },
  cancelBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  cancelText: { fontFamily: fonts.semibold, color: colors.text },
  confirmBtn: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: radii.control,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmText: { fontFamily: fonts.bold, color: '#fff' },
});
