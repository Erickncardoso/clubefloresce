import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeftRight, Check, CircleHelp, FileText, X } from 'lucide-react-native';
import { useMealItemOverrides } from '@/hooks/useMealItemOverrides';
import { useMealSubstitutions, type SubstitutionGroup } from '@/hooks/useMealSubstitutions';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = {
  open: boolean;
  mealId: string;
  mealLabel: string;
  groups: SubstitutionGroup[];
  onClose: () => void;
};

export default function DietaMealSubstitutionsModal({
  open,
  mealId,
  mealLabel,
  groups,
  onClose,
}: Props) {
  const { pdfSource } = useMealSubstitutions();
  const { getOverrideForItem, setOverride, isSameOverride } = useMealItemOverrides();
  const [initialOverrides, setInitialOverrides] = useState<Record<string, SubstitutionGroup['options'][number] | null>>({});
  const [draftOverrides, setDraftOverrides] = useState<Record<string, SubstitutionGroup['options'][number] | null>>({});

  const changedGroups = useMemo(
    () => groups.filter((group) => !areChoicesEqual(initialOverrides[group.key], draftOverrides[group.key])),
    [draftOverrides, groups, initialOverrides],
  );

  const changesCount = changedGroups.length;
  const changesStatus = changesCount
    ? `${changesCount} ${changesCount === 1 ? 'alteração selecionada' : 'alterações selecionadas'}`
    : 'Nenhuma alteração pendente';
  const saveLabel = changesCount
    ? `Salvar ${changesCount === 1 ? 'alteração' : 'alterações'}`
    : 'Concluir';

  function areChoicesEqual(
    first: SubstitutionGroup['options'][number] | null | undefined,
    second: SubstitutionGroup['options'][number] | null | undefined,
  ) {
    if (!first && !second) return true;
    if (!first || !second) return false;
    return isSameOverride(first, second);
  }

  function syncDraft() {
    const current: Record<string, SubstitutionGroup['options'][number] | null> = {};
    for (const group of groups) {
      const stored = getOverrideForItem(mealId, group.key);
      if (!stored) {
        current[group.key] = null;
        continue;
      }
      const matched = group.options.find((option) => isSameOverride(stored, option));
      current[group.key] = matched || null;
    }
    setInitialOverrides({ ...current });
    setDraftOverrides({ ...current });
  }

  useEffect(() => {
    if (open) syncDraft();
  }, [open, groups, mealId]);

  function resolveDraftChoice(itemKey: string) {
    return draftOverrides[itemKey] ?? null;
  }

  function selectSubstitution(itemKey: string, option: SubstitutionGroup['options'][number] | null) {
    setDraftOverrides((current) => ({ ...current, [itemKey]: option }));
  }

  function saveChanges() {
    for (const group of groups) {
      setOverride(mealId, group.key, resolveDraftChoice(group.key));
    }
    setInitialOverrides({ ...draftOverrides });
    onClose();
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.head}>
          <View style={styles.heading}>
            <View style={styles.handle} />
            <Text style={styles.eyebrow}>Substituição da refeição</Text>
            <Text style={styles.title}>Escolha o que deseja trocar</Text>
            <Text style={styles.meal}>{mealLabel}</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <X size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.guidance}>
            <CircleHelp size={16} color="#72806b" />
            <Text style={styles.guidanceText}>
              Selecione uma opção para cada alimento que quiser trocar. As alterações só serão aplicadas ao salvar.
            </Text>
          </View>

          <View style={styles.sourceRow}>
            <FileText size={13} color="#8b9088" />
            <Text style={styles.sourceText}>Opções definidas em {pdfSource.label}</Text>
          </View>

          {groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <Text style={styles.sectionLabel}>Alimento do plano</Text>
              <Pressable
                style={[styles.choice, !resolveDraftChoice(group.key) && styles.choiceActive]}
                onPress={() => selectSubstitution(group.key, null)}
              >
                <View style={styles.choiceCopy}>
                  <Text style={styles.choiceTitle}>{group.prescribedLabel}</Text>
                  <Text style={styles.choiceMeta}>Manter como foi prescrito</Text>
                </View>
                <View style={[styles.radio, !resolveDraftChoice(group.key) && styles.radioActive]}>
                  {!resolveDraftChoice(group.key) ? <Check size={12} color="#fff" strokeWidth={3} /> : null}
                </View>
              </Pressable>

              <Text style={styles.sectionLabelOptions}>
                Trocar por · {group.options.length} {group.options.length === 1 ? 'opção' : 'opções'}
              </Text>

              {group.options.map((option, index) => {
                const active = areChoicesEqual(resolveDraftChoice(group.key), option);
                return (
                  <Pressable
                    key={`${group.key}-${index}`}
                    style={[styles.choice, styles.optionChoice, active && styles.choiceActive]}
                    onPress={() => selectSubstitution(group.key, option)}
                  >
                    <View style={styles.optionSymbol}>
                      <ArrowLeftRight size={14} color="#708067" />
                    </View>
                    <View style={styles.choiceCopy}>
                      <Text style={styles.choiceTitle}>{option.label}</Text>
                      <Text style={styles.choiceMeta}>{option.note || 'Porção equivalente'}</Text>
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
          <Text style={styles.status}>{changesStatus}</Text>
          <Pressable style={styles.saveBtn} onPress={saveChanges}>
            <Check size={16} color="#fff" />
            <Text style={styles.saveText}>{saveLabel}</Text>
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
  meal: { fontFamily: fonts.medium, fontSize: 13, color: '#8a6c72', marginTop: 4 },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f2f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: spacing[4], paddingVertical: spacing[4] },
  guidance: {
    flexDirection: 'row',
    gap: spacing[2],
    padding: spacing[3],
    borderWidth: 1,
    borderColor: '#e4e9e1',
    borderRadius: 14,
    backgroundColor: '#f6f8f4',
    marginBottom: spacing[3],
  },
  guidanceText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: '#596255', lineHeight: 17 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing[4] },
  sourceText: { fontFamily: fonts.regular, fontSize: 11, color: '#8b9088' },
  group: {
    padding: spacing[3],
    borderWidth: 1,
    borderColor: '#e1e4df',
    borderRadius: 16,
    marginBottom: spacing[3],
  },
  sectionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: '#80857e',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  sectionLabelOptions: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: '#80857e',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderWidth: 1,
    borderColor: '#e2e5e0',
    borderRadius: 13,
    marginBottom: spacing[2],
    backgroundColor: '#fff',
  },
  optionChoice: { paddingLeft: spacing[2] },
  choiceActive: { borderColor: '#84967a', backgroundColor: '#f4f7f2' },
  optionSymbol: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#edf2ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceCopy: { flex: 1 },
  choiceTitle: { fontFamily: fonts.medium, fontSize: 13, color: '#2c302b' },
  choiceMeta: { fontFamily: fonts.regular, fontSize: 11, color: '#858a82', marginTop: 2 },
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
  status: { fontFamily: fonts.regular, fontSize: 11, color: '#858a82', textAlign: 'center', marginBottom: spacing[2] },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#7d9073',
  },
  saveText: { fontFamily: fonts.semibold, fontSize: 14, color: '#fff' },
});
