import { Modal, Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { BELLA_ACTIONS } from '@/lib/bella-actions';
import { patientAssets } from '@/lib/patient-assets';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function BellaActionSheet({ open, onClose }: Props) {
  const router = useRouter();

  function selectAction(action: (typeof BELLA_ACTIONS)[number]) {
    onClose();
    if (action.route) {
      router.push(action.route as never);
      return;
    }
    router.push(`/bella/chat/${action.id}` as never);
  }

  function startChat() {
    onClose();
    router.push('/bella/chat/general' as never);
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.head}>
          <View style={styles.heroIcon}>
            <Image source={patientAssets.bellaAvatar} style={styles.heroImg} resizeMode="cover" />
          </View>
          <View style={styles.headCopy}>
            <Text style={styles.title}>Bella IA</Text>
            <Text style={styles.subtitle}>Como posso te ajudar hoje?</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <X color={colors.textMuted} size={18} />
          </Pressable>
        </View>

        <View style={styles.grid}>
          {BELLA_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Pressable key={action.id} style={styles.action} onPress={() => selectAction(action)}>
                <View style={styles.actionIcon}>
                  <Icon color={colors.primaryDark} size={18} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.chatBtn} onPress={startChat}>
          <Text style={styles.chatBtnText}>Iniciar conversa</Text>
        </Pressable>
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.surface,
    borderTopRightRadius: radii.surface,
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[8],
    paddingTop: spacing[2],
    maxHeight: '82%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.track,
    marginBottom: spacing[4],
  },
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
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
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
    backgroundColor: colors.primary,
    borderRadius: radii.control,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBtnText: { color: '#fff', fontFamily: fonts.bold, fontSize: 16 },
});
