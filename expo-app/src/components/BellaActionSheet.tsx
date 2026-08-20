import { InteractionManager, Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import AppleBottomSheet, { useBottomSheetDismiss } from '@/components/ui/PatientBottomSheet';
import { usePatientPlanAccess } from '@/hooks/usePatientPlanAccess';
import { BELLA_ACTIONS } from '@/lib/bella-actions';
import { patientAssets } from '@/lib/patient-assets';
import { triggerImpactHaptic } from '@/lib/picker-haptics';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = {
  open: boolean;
  onClose: () => void;
};

function runAfterSheetClosed(action: () => void) {
  InteractionManager.runAfterInteractions(() => {
    setTimeout(action, 320);
  });
}

function SheetBody() {
  const router = useRouter();
  const { dismissThen } = useBottomSheetDismiss();
  const { hasPaidAccess } = usePatientPlanAccess();

  const actions = useMemo(
    () => (hasPaidAccess
      ? BELLA_ACTIONS
      : BELLA_ACTIONS.filter((action) => action.route !== '/dieta')),
    [hasPaidAccess],
  );

  function navigateAfterClose(path: string) {
    dismissThen(() => runAfterSheetClosed(() => {
      router.push(path as never);
    }));
  }

  function selectAction(action: (typeof BELLA_ACTIONS)[number]) {
    triggerImpactHaptic();
    if (action.route) {
      navigateAfterClose(action.route);
      return;
    }
    navigateAfterClose(`/bella/chat/${action.id}`);
  }

  function startChat() {
    triggerImpactHaptic();
    navigateAfterClose('/bella/chat/general');
  }

  return (
    <View>
      <View style={styles.head}>
        <View style={styles.heroIcon}>
          <Image source={patientAssets.bellaAvatar} style={styles.heroImg} resizeMode="cover" />
        </View>
        <View style={styles.headCopy}>
          <Text style={styles.title}>Bella IA</Text>
          <Text style={styles.subtitle}>Como posso te ajudar hoje?</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Pressable
              key={action.id}
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
              onPress={() => selectAction(action)}
            >
              <View style={styles.actionIcon}>
                <Icon color={colors.text} size={18} strokeWidth={1.85} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={({ pressed }) => [styles.chatBtn, pressed && styles.chatBtnPressed]}
        onPress={startChat}
      >
        <Text style={styles.chatBtnText}>Iniciar conversa</Text>
      </Pressable>
    </View>
  );
}

export default function BellaActionSheet({ open, onClose }: Props) {
  return (
    <AppleBottomSheet visible={open} onClose={onClose} maxHeightRatio={0.72} contentPadding={20}>
      <SheetBody />
    </AppleBottomSheet>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#f5dfe1',
    overflow: 'hidden',
  },
  heroImg: { width: '100%', height: '100%' },
  headCopy: { flex: 1 },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  action: {
    width: '47%',
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    padding: spacing[3],
    backgroundColor: colors.surface,
  },
  actionPressed: {
    backgroundColor: '#f2f2f7',
    transform: [{ scale: 0.98 }],
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
  },
  chatBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: radii.control,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  chatBtnPressed: {
    opacity: 0.88,
  },
  chatBtnText: { color: '#fff', fontFamily: fonts.bold, fontSize: 16 },
});
