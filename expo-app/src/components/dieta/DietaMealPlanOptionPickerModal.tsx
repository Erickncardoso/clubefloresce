import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Clock3, Layers } from 'lucide-react-native';
import AppleBottomSheet from '@/components/ui/AppleBottomSheet';
import {
  GoalSheetHead,
  GoalSheetSaveButton,
  GoalSheetScroll,
} from '@/components/evolucao/EvolucaoGoalSheetUi';
import { useMealPlanOptionSelections } from '@/hooks/useMealPlanOptionSelections';
import { mealOptionVariantLabel } from '@/lib/meal-plan-options';
import type { MealPlanFoodItem, MealPlanMeal } from '@/lib/meal-plan-api';
import { triggerImpactHaptic } from '@/lib/picker-haptics';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const PREVIEW_LIMIT = 4;

type Props = {
  open: boolean;
  required?: boolean;
  focusSlotKey?: string;
  title?: string;
  confirmLabel?: string;
  onClose: () => void;
  onSaved: () => void;
};

type FoodLine = { name: string; qty?: string };

function foodLine(item: MealPlanFoodItem): FoodLine {
  const name = String(item.name || item.food || item.label || '').trim();
  const qtyParts: string[] = [];
  if (item.amount != null && Number(item.amount) > 0) {
    qtyParts.push(`${item.amount}${item.unit ? ` ${item.unit}` : ''}`.trim());
  } else if (item.grams != null && Number(item.grams) > 0) {
    qtyParts.push(`${Math.round(Number(item.grams))} g`);
  }
  if (name) return { name, qty: qtyParts[0] };
  return { name: String(item.display || 'Alimento').trim(), qty: qtyParts[0] };
}

function optionFoods(option: MealPlanMeal): FoodLine[] {
  return (option.items || []).map(foodLine).filter((line) => line.name);
}

function optionTitle(option: MealPlanMeal, index: number) {
  const variant = mealOptionVariantLabel(option.label, index);
  if (!/^opção\s*\d+$/i.test(variant)) return variant;
  const first = optionFoods(option)[0]?.name;
  return first || variant;
}

export default function DietaMealPlanOptionPickerModal({
  open,
  required = false,
  focusSlotKey = '',
  title = 'Escolha o que vai seguir',
  confirmLabel = 'Confirmar escolhas',
  onClose,
  onSaved,
}: Props) {
  const {
    optionGroups,
    selectedMealBySlot,
    saving,
    saveError,
    saveSelections,
  } = useMealPlanOptionSelections();

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [localError, setLocalError] = useState('');

  const visibleGroups = useMemo(() => {
    const focus = String(focusSlotKey || '').trim();
    if (!focus) return optionGroups;
    return optionGroups.filter((group) => group.slotKey === focus);
  }, [focusSlotKey, optionGroups]);

  const errorMessage = localError || saveError;
  const canSave = visibleGroups.every((group) => Boolean(draft[group.slotKey]));

  useEffect(() => {
    if (!open) return;
    const next = { ...(selectedMealBySlot || {}) };
    for (const group of visibleGroups) {
      if (!next[group.slotKey]) {
        next[group.slotKey] = group.options[0]?.id || '';
      }
    }
    setDraft(next);
    setLocalError('');
  }, [open, visibleGroups, selectedMealBySlot]);

  async function confirm() {
    if (!canSave || saving) {
      throw new Error(errorMessage || 'Escolha uma opção para continuar.');
    }

    const payload: Record<string, string> = {};
    for (const group of optionGroups) {
      const fromDraft = draft[group.slotKey];
      const fromSaved = selectedMealBySlot?.[group.slotKey];
      payload[group.slotKey] = fromDraft || fromSaved || group.options[0]?.id || '';
    }

    await saveSelections(payload);
    onSaved();
  }

  return (
    <AppleBottomSheet
      visible={open}
      onClose={onClose}
      dismissible={!required}
      maxHeightRatio={0.88}
      contentPadding={0}
      fillHeight
    >
      <GoalSheetScroll>
        <GoalSheetHead
          icon={Layers}
          iconBg={colors.primarySoft}
          iconColor={colors.primaryDark}
          title={title}
          subtitle="Toque na opção de cada refeição. Só uma por horário."
        />

        {visibleGroups.map((group) => (
          <View key={group.slotKey} style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{group.label}</Text>
              <Text style={styles.sectionHint}>
                {group.options.length} opções · escolha 1
              </Text>
            </View>

            {group.options.map((option, index) => {
              const active = draft[group.slotKey] === option.id;
              const foods = optionFoods(option);
              const visibleFoods = foods.slice(0, PREVIEW_LIMIT);
              const extra = foods.length - visibleFoods.length;

              return (
                <Pressable
                  key={option.id}
                  style={[styles.card, active && styles.cardActive]}
                  onPress={() => {
                    triggerImpactHaptic();
                    setDraft((current) => ({ ...current, [group.slotKey]: option.id }));
                    setLocalError('');
                  }}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardTitleWrap}>
                      <Text style={styles.cardKicker}>Opção {index + 1}</Text>
                      <Text style={styles.cardTitle}>{optionTitle(option, index)}</Text>
                    </View>
                    <View style={[styles.check, active && styles.checkOn]}>
                      {active ? <Check size={14} color="#fff" strokeWidth={2.6} /> : null}
                    </View>
                  </View>

                  {option.time ? (
                    <View style={styles.timeRow}>
                      <Clock3 size={13} color={colors.textMuted} strokeWidth={2} />
                      <Text style={styles.timeText}>{option.time}</Text>
                    </View>
                  ) : null}

                  {visibleFoods.length ? (
                    <View style={styles.foodList}>
                      {visibleFoods.map((food, foodIndex) => (
                        <View key={`${option.id}-${foodIndex}`} style={styles.foodRow}>
                          <View style={styles.foodDot} />
                          <Text style={styles.foodName} numberOfLines={1}>{food.name}</Text>
                          {food.qty ? <Text style={styles.foodQty}>{food.qty}</Text> : null}
                        </View>
                      ))}
                      {extra > 0 ? (
                        <Text style={styles.foodMore}>+{extra} {extra === 1 ? 'alimento' : 'alimentos'}</Text>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={styles.foodEmpty}>Sem itens listados</Text>
                  )}

                  {active ? <Text style={styles.chosen}>Selecionada para hoje</Text> : null}
                </Pressable>
              );
            })}
          </View>
        ))}

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <GoalSheetSaveButton
          label={saving ? 'Salvando…' : confirmLabel}
          disabled={!canSave || saving}
          onPress={confirm}
        />
      </GoalSheetScroll>
    </AppleBottomSheet>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[5],
  },
  sectionHead: {
    marginBottom: spacing[3],
    gap: 2,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.text,
  },
  sectionHint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    padding: spacing[4],
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  cardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  cardTitleWrap: { flex: 1, minWidth: 0 },
  cardKicker: {
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 0.3,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  cardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primaryDark,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  foodList: { gap: 6, marginTop: 2 },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  foodDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  foodName: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
  },
  foodQty: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  foodMore: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primaryDark,
    marginLeft: 13,
  },
  foodEmpty: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  chosen: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primaryDark,
    marginTop: 2,
  },
  error: {
    marginTop: spacing[2],
    marginHorizontal: spacing[4],
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.error,
    textAlign: 'center',
  },
});
