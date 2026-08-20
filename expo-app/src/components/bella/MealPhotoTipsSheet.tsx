import { InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, UtensilsCrossed, X } from 'lucide-react-native';
import AppleBottomSheet, { useBottomSheetDismiss } from '@/components/ui/AppleBottomSheet';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
};

function runAfterSheetClosed(action: () => void) {
  InteractionManager.runAfterInteractions(() => {
    setTimeout(action, 320);
  });
}

function SheetBody({ onContinue }: { onContinue: () => void }) {
  const { dismissThen } = useBottomSheetDismiss();

  function handleEntendi() {
    dismissThen(() => runAfterSheetClosed(onContinue));
  }

  return (
    <>
      <Text style={styles.title}>Antes de fotografar</Text>
      <Text style={styles.copy}>
        Enquadre só o seu prato, de cima e com boa luz. A Bella lê o que aparece na foto — mesa
        cheia ou vários pratos confundem a análise.
      </Text>

      <View style={styles.row}>
        <View style={styles.example}>
          <View style={[styles.preview, styles.previewGood]}>
            <UtensilsCrossed color={colors.primaryDark} size={28} strokeWidth={1.7} />
          </View>
          <View style={[styles.badge, styles.badgeGood]}>
            <Check color="#fff" size={14} strokeWidth={2.4} />
          </View>
          <Text style={styles.exampleLabel}>Um prato, de cima</Text>
        </View>
        <View style={styles.example}>
          <View style={[styles.preview, styles.previewBad]}>
            <View style={styles.clutter}>
              <View style={styles.clutterDot} />
              <View style={[styles.clutterDot, styles.clutterDotAlt]} />
              <View style={styles.clutterDot} />
            </View>
          </View>
          <View style={[styles.badge, styles.badgeBad]}>
            <X color="#fff" size={14} strokeWidth={2.4} />
          </View>
          <Text style={styles.exampleLabel}>Mesa inteira</Text>
        </View>
      </View>

      <Pressable style={styles.cta} onPress={handleEntendi}>
        <Text style={styles.ctaText}>Entendi</Text>
      </Pressable>
    </>
  );
}

export default function MealPhotoTipsSheet({ open, onClose, onContinue }: Props) {
  return (
    <AppleBottomSheet visible={open} onClose={onClose} maxHeightRatio={0.62} contentPadding={20}>
      <SheetBody onContinue={onContinue} />
    </AppleBottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  copy: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing[5],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  example: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[2],
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewGood: {
    backgroundColor: colors.primarySoft,
  },
  previewBad: {
    backgroundColor: '#f3f1ef',
  },
  clutter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 72,
    gap: 8,
    justifyContent: 'center',
  },
  clutterDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#d8d3cc',
  },
  clutterDotAlt: {
    width: 28,
    height: 16,
    borderRadius: 8,
  },
  badge: {
    marginTop: -18,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeGood: {
    backgroundColor: colors.primaryDark,
  },
  badgeBad: {
    backgroundColor: colors.error,
  },
  exampleLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
    textAlign: 'center',
  },
  cta: {
    minHeight: 50,
    borderRadius: radii.surface,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: '#fff',
  },
});
