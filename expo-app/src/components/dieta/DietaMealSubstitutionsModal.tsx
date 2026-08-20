import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { ArrowLeftRight, Check, CircleHelp, FileText } from 'lucide-react-native';
import AppleBottomSheet, { useBottomSheetDismiss } from '@/components/ui/AppleBottomSheet';
import {
  DietaGroupedDivider,
  DietaGroupedList,
  DietaSheetHeader,
  DietaSheetPrimaryButton,
  DIETA_SHEET_GUTTER,
} from '@/components/dieta/DietaSheetUi';
import { useMealItemOverrides } from '@/hooks/useMealItemOverrides';
import { useMealSubstitutions, type SubstitutionGroup } from '@/hooks/useMealSubstitutions';
import { triggerImpactHaptic } from '@/lib/picker-haptics';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  open: boolean;
  mealId: string;
  mealLabel: string;
  groups: SubstitutionGroup[];
  onClose: () => void;
};

type Option = SubstitutionGroup['options'][number];

function SelectionRow({
  title,
  meta,
  selected,
  leading,
  onPress,
}: {
  title: string;
  meta: string;
  selected: boolean;
  leading?: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        pressed && styles.rowPressed,
      ]}
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        triggerImpactHaptic();
        onPress();
      }}
    >
      {leading}
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, selected && styles.rowTitleSelected]}>{title}</Text>
        <Text style={styles.rowMeta}>{meta}</Text>
      </View>
      <View style={[styles.checkRing, selected && styles.checkRingActive]}>
        {selected ? <Check size={14} color="#fff" strokeWidth={2.5} /> : null}
      </View>
    </Pressable>
  );
}

function SheetBody({
  mealId,
  mealLabel,
  groups,
}: Omit<Props, 'open' | 'onClose'>) {
  const { dismiss } = useBottomSheetDismiss();
  const { pdfSource } = useMealSubstitutions();
  const { getOverrideForItem, setOverride, isSameOverride } = useMealItemOverrides();
  const [initialOverrides, setInitialOverrides] = useState<Record<string, Option | null>>({});
  const [draftOverrides, setDraftOverrides] = useState<Record<string, Option | null>>({});

  function areChoicesEqual(first: Option | null | undefined, second: Option | null | undefined) {
    if (!first && !second) return true;
    if (!first || !second) return false;
    return isSameOverride(first, second);
  }

  const changedGroups = useMemo(
    () => groups.filter((group) => !areChoicesEqual(initialOverrides[group.key], draftOverrides[group.key])),
    [draftOverrides, groups, initialOverrides, isSameOverride],
  );

  const changesCount = changedGroups.length;
  const saveLabel = changesCount
    ? `Salvar ${changesCount} ${changesCount === 1 ? 'troca' : 'trocas'}`
    : 'Concluir';

  function syncDraft() {
    const current: Record<string, Option | null> = {};
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
    syncDraft();
  }, [mealId, groups]);

  function resolveDraftChoice(itemKey: string) {
    return draftOverrides[itemKey] ?? null;
  }

  function selectSubstitution(itemKey: string, option: Option | null) {
    setDraftOverrides((current) => ({ ...current, [itemKey]: option }));
  }

  function saveChanges() {
    triggerImpactHaptic();
    for (const group of groups) {
      setOverride(mealId, group.key, resolveDraftChoice(group.key));
    }
    setInitialOverrides({ ...draftOverrides });
    dismiss();
  }

  return (
    <View style={styles.root}>
      <DietaSheetHeader
        icon={ArrowLeftRight}
        title="Substituições"
        subtitle={mealLabel}
        badge={changesCount > 0 ? `${changesCount} pendente${changesCount === 1 ? '' : 's'}` : undefined}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.tip}>
          <CircleHelp size={18} color={colors.primaryDark} />
          <Text style={styles.tipText}>
            Toque para trocar um item. Só aplica na refeição depois de salvar.
          </Text>
        </View>

        <View style={styles.sourcePill}>
          <FileText size={13} color={colors.primaryDark} />
          <Text style={styles.sourceText}>{pdfSource.label}</Text>
        </View>

        {groups.map((group, groupIndex) => (
          <View key={group.key} style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionIndex}>{groupIndex + 1}</Text>
              <View style={styles.sectionHeadCopy}>
                <Text style={styles.sectionTitle} numberOfLines={2}>{group.prescribedLabel}</Text>
                <Text style={styles.sectionMeta}>
                  {group.options.length} {group.options.length === 1 ? 'substituto' : 'substitutos'}
                </Text>
              </View>
            </View>

            <DietaGroupedList>
              <SelectionRow
                title="Manter prescrito"
                meta="Sem alteração neste item"
                selected={!resolveDraftChoice(group.key)}
                onPress={() => selectSubstitution(group.key, null)}
              />
              {group.options.map((option, index) => {
                const active = areChoicesEqual(resolveDraftChoice(group.key), option);
                return (
                  <View key={`${group.key}-${index}`}>
                    <DietaGroupedDivider inset={spacing[4]} />
                    <SelectionRow
                      title={option.label}
                      meta={option.note || 'Porção equivalente'}
                      selected={active}
                      leading={(
                        <View style={styles.swapIcon}>
                          <ArrowLeftRight size={14} color={colors.primaryDark} strokeWidth={1.9} />
                        </View>
                      )}
                      onPress={() => selectSubstitution(group.key, option)}
                    />
                  </View>
                );
              })}
            </DietaGroupedList>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.foot, { paddingBottom: spacing[2] }]}>
        <DietaSheetPrimaryButton
          label={saveLabel}
          sublabel={changesCount > 0 ? 'Suas escolhas entram na refeição de hoje' : undefined}
          onPress={saveChanges}
        />
      </View>
    </View>
  );
}

export default function DietaMealSubstitutionsModal({
  open,
  mealId,
  mealLabel,
  groups,
  onClose,
}: Props) {
  return (
    <AppleBottomSheet
      visible={open}
      onClose={onClose}
      maxHeightRatio={0.88}
      contentPadding={0}
      topRadius={28}
      fillHeight
    >
      {open ? (
        <SheetBody mealId={mealId} mealLabel={mealLabel} groups={groups} />
      ) : null}
    </AppleBottomSheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: {
    paddingHorizontal: DIETA_SHEET_GUTTER,
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radii.control,
    backgroundColor: colors.primarySoft,
    marginBottom: spacing[3],
  },
  tipText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.primaryDark,
    lineHeight: 20,
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: '#f2f2f7',
    marginBottom: spacing[4],
  },
  sourceText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primaryDark,
  },
  section: { marginBottom: spacing[4] },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginBottom: 10,
  },
  sectionIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
    textAlign: 'center',
    lineHeight: 28,
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  sectionHeadCopy: { flex: 1, minWidth: 0 },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
  },
  sectionMeta: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: 56,
    paddingHorizontal: spacing[4],
    paddingVertical: 10,
  },
  rowSelected: {
    backgroundColor: 'rgba(111, 120, 99, 0.08)',
  },
  rowPressed: {
    backgroundColor: '#e8e8ed',
  },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  rowTitleSelected: {
    fontFamily: fonts.semibold,
    color: colors.primaryDark,
  },
  rowMeta: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  checkRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#c7c7cc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkRingActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  swapIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foot: {
    paddingHorizontal: DIETA_SHEET_GUTTER,
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e5ea',
    backgroundColor: '#fff',
  },
});
