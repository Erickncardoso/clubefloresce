import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useMealPlanOptionSelections } from '@/hooks/useMealPlanOptionSelections';
import { mealOptionVariantLabel } from '@/lib/meal-plan-options';
import type { MealPlanMeal } from '@/lib/meal-plan-api';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

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

  function syncDraft() {
    const next = { ...(selectedMealBySlot || {}) };
    for (const group of visibleGroups) {
      if (!next[group.slotKey]) {
        next[group.slotKey] = group.options[0]?.id || '';
      }
    }
    setDraft(next);
    setLocalError('');
  }

  useEffect(() => {
    if (open) syncDraft();
  }, [open, visibleGroups, selectedMealBySlot]);

  async function confirm() {
    if (!canSave || saving) return;
    setLocalError('');

    try {
      const payload: Record<string, string> = {};
      for (const group of optionGroups) {
        const fromDraft = draft[group.slotKey];
        const fromSaved = selectedMealBySlot?.[group.slotKey];
        payload[group.slotKey] = fromDraft || fromSaved || group.options[0]?.id || '';
      }

      await saveSelections(payload);
      onSaved();
      onClose();
    } catch {
      /* saveError no hook */
    }
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => { if (!required) onClose(); }}>
      <Pressable style={styles.backdrop} onPress={() => { if (!required) onClose(); }} />
      <View style={styles.sheet}>
        <View style={styles.head}>
          <View style={styles.heading}>
            <View style={styles.handle} />
            <Text style={styles.eyebrow}>Seu cardápio</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.lead}>
              Seu plano tem mais de uma opção para algumas refeições. Escolha qual deseja seguir. Você pode trocar depois.
            </Text>
          </View>
          {!required ? (
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView style={styles.content}>
          {visibleGroups.map((group) => (
            <View key={group.slotKey} style={styles.group}>
              <View style={styles.groupHead}>
                <Text style={styles.groupTitle}>{group.label}</Text>
                <Text style={styles.groupCount}>{group.options.length} opções</Text>
              </View>

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
            </View>
          ))}
        </ScrollView>

        <View style={styles.foot}>
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <Pressable
            style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]}
            disabled={!canSave || saving}
            onPress={confirm}
          >
            <Check size={16} color="#fff" />
            <Text style={styles.saveText}>{saving ? 'Salvando…' : confirmLabel}</Text>
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
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: '#eceeea',
  },
  heading: { flex: 1 },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#d8dbd6',
    marginBottom: spacing[3],
  },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#778372',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text, marginTop: 4 },
  lead: { fontFamily: fonts.regular, fontSize: 13, color: '#6f756d', marginTop: 6, lineHeight: 18 },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f2f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: spacing[4], paddingVertical: spacing[4] },
  group: { marginBottom: spacing[4], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: '#eceeea' },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[3] },
  groupTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  groupCount: { fontFamily: fonts.medium, fontSize: 12, color: '#858a82' },
  choice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[3],
    borderWidth: 1.5,
    borderColor: '#dce0d9',
    borderRadius: 16,
    marginBottom: spacing[2],
    backgroundColor: '#fff',
  },
  choiceActive: { borderColor: '#758b6b', backgroundColor: '#f3f7f1' },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e8ebe5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: { backgroundColor: '#758b6b' },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, color: '#5f675c' },
  badgeTextActive: { color: '#fff' },
  choiceCopy: { flex: 1 },
  choiceTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  choiceTime: { fontFamily: fonts.medium, fontSize: 12, color: '#858a82', marginTop: 2 },
  choicePreview: { fontFamily: fonts.regular, fontSize: 12, color: '#6f756d', marginTop: 4, lineHeight: 16 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#c9cdc6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: '#758b6b', backgroundColor: '#758b6b' },
  foot: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[6],
    borderTopWidth: 1,
    borderTopColor: '#e6e9e4',
  },
  error: { fontFamily: fonts.regular, fontSize: 12, color: '#a14b4b', textAlign: 'center', marginBottom: spacing[2] },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#7d9073',
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveText: { fontFamily: fonts.semibold, fontSize: 14, color: '#fff' },
});
