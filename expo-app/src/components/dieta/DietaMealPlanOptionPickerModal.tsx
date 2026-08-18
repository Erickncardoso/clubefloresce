import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Layers } from 'lucide-react-native';
import AppleBottomSheet from '@/components/ui/AppleBottomSheet';
import {
  GoalSheetHead,
  GoalSheetSaveButton,
  GoalSheetScroll,
  GoalSheetSection,
} from '@/components/evolucao/EvolucaoGoalSheetUi';
import { useMealPlanOptionSelections } from '@/hooks/useMealPlanOptionSelections';
import { mealOptionVariantLabel } from '@/lib/meal-plan-options';
import type { MealPlanMeal } from '@/lib/meal-plan-api';
import { fonts } from '@/theme/tokens';

type Props = {
  open: boolean;
  required?: boolean;
  focusSlotKey?: string;
  title?: string;
  confirmLabel?: string;
  onClose: () => void;
  onSaved: () => void;
};

function previewItems(option: MealPlanMeal) {
  const items = option?.items || [];
  if (!items.length) return 'Sem itens listados';
  const labels = items
    .slice(0, 3)
    .map((item) => item.display || item.name || '')
    .filter(Boolean);
  const more = items.length > 3 ? ` +${items.length - 3}` : '';
  return `${labels.join(' · ')}${more}`;
}

export default function DietaMealPlanOptionPickerModal({
  open,
  required = false,
  focusSlotKey = '',
  title = 'Escolha suas opções',
  confirmLabel = 'Continuar',
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
    >
      <GoalSheetScroll>
        <GoalSheetHead
          icon={Layers}
          iconBg="#eff4ec"
          iconColor="#62785a"
          title={title}
          subtitle="Seu plano tem mais de uma opção em algumas refeições. Escolha qual seguir."
        />

        {visibleGroups.map((group) => (
          <GoalSheetSection
            key={group.slotKey}
            title={group.label}
            description={`${group.options.length} opções`}
          >
            {group.options.map((option, index) => {
              const active = draft[group.slotKey] === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.choice, active && styles.choiceActive]}
                  onPress={() => {
                    setDraft((current) => ({ ...current, [group.slotKey]: option.id }));
                    setLocalError('');
                  }}
                >
                  <View style={[styles.badge, active && styles.badgeActive]}>
                    <Text style={[styles.badgeText, active && styles.badgeTextActive]}>{index + 1}</Text>
                  </View>
                  <View style={styles.choiceCopy}>
                    <Text style={styles.choiceTitle}>{mealOptionVariantLabel(option.label, index)}</Text>
                    {option.time ? <Text style={styles.choiceTime}>{option.time}</Text> : null}
                    <Text style={styles.choicePreview}>{previewItems(option)}</Text>
                  </View>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? <Check size={12} color="#fff" strokeWidth={3} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </GoalSheetSection>
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
  choice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e3e5e2',
    borderRadius: 14,
    marginTop: 8,
    backgroundColor: '#fff',
  },
  choiceActive: {
    borderColor: '#c5d0bf',
    backgroundColor: '#f5f8f3',
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#eceeea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: { backgroundColor: '#6f7863' },
  badgeText: { fontFamily: fonts.medium, fontSize: 12, color: '#5f675c' },
  badgeTextActive: { color: '#fff' },
  choiceCopy: { flex: 1 },
  choiceTitle: { fontFamily: fonts.medium, fontSize: 15, color: '#202124' },
  choiceTime: { fontFamily: fonts.regular, fontSize: 12, color: '#6c7074', marginTop: 2 },
  choicePreview: { fontFamily: fonts.regular, fontSize: 12, color: '#686d72', marginTop: 4, lineHeight: 16 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d2d4d6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: '#6f7863', backgroundColor: '#6f7863' },
  error: {
    marginTop: 12,
    marginHorizontal: 16,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#a14b4b',
    textAlign: 'center',
  },
});
