import { ActivityIndicator, InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Device from 'expo-device';
import { Camera, ImagePlus } from 'lucide-react-native';
import AppleBottomSheet, { useBottomSheetDismiss } from '@/components/ui/AppleBottomSheet';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = {
  visible: boolean;
  uploading?: boolean;
  title?: string;
  onClose: () => void;
  onPickGallery: () => void;
  onTakePhoto: () => void;
};

/** Aguarda o Modal do sheet desmontar antes de abrir câmera/galeria (iOS). */
function runAfterSheetClosed(action: () => void) {
  InteractionManager.runAfterInteractions(() => {
    setTimeout(action, 320);
  });
}

function SheetAction({
  label,
  icon: Icon,
  onPress,
  disabled = false,
}: {
  label: string;
  icon: typeof Camera;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.action, disabled && styles.actionDisabled]}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
    >
      <View style={styles.actionIcon}>
        <Icon color="#6e6e73" size={18} strokeWidth={1.9} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function SheetBody({
  uploading,
  title = 'Alterar foto do perfil',
  onPickGallery,
  onTakePhoto,
}: Pick<Props, 'uploading' | 'title' | 'onPickGallery' | 'onTakePhoto'>) {
  const { dismiss, dismissThen } = useBottomSheetDismiss();

  function handleGallery() {
    dismissThen(() => runAfterSheetClosed(onPickGallery));
  }

  function handleCamera() {
    dismissThen(() => runAfterSheetClosed(onTakePhoto));
  }

  return (
    <>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.group}>
        <SheetAction
          label="Escolher da galeria"
          icon={ImagePlus}
          disabled={uploading}
          onPress={handleGallery}
        />
        <View style={styles.divider} />
        <SheetAction
          label="Tirar foto"
          icon={Camera}
          disabled={uploading}
          onPress={handleCamera}
        />
      </View>
      {!Device.isDevice ? (
        <Text style={styles.simulatorHint}>
          No simulador, Tirar foto abre a galeria. Em um iPhone físico, a câmera abre normalmente.
        </Text>
      ) : null}
      {uploading ? (
        <View style={styles.uploadingRow}>
          <ActivityIndicator color={colors.primaryDark} size="small" />
          <Text style={styles.uploadingText}>Enviando foto…</Text>
        </View>
      ) : null}
      <Pressable style={styles.cancelBtn} accessibilityRole="button" onPress={dismiss}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </Pressable>
    </>
  );
}

export default function ProfileAvatarPickerSheet({
  visible,
  uploading = false,
  title = 'Alterar foto do perfil',
  onClose,
  onPickGallery,
  onTakePhoto,
}: Props) {
  return (
    <AppleBottomSheet visible={visible} onClose={onClose} maxHeightRatio={0.36} contentPadding={16}>
      <SheetBody
        title={title}
        uploading={uploading}
        onPickGallery={onPickGallery}
        onTakePhoto={onTakePhoto}
      />
    </AppleBottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  group: {
    borderRadius: radii.surface,
    backgroundColor: '#f2f2f7',
    overflow: 'hidden',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: 52,
    paddingHorizontal: spacing[4],
  },
  actionDisabled: {
    opacity: 0.55,
  },
  actionIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#e8e8ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#d1d1d6',
    marginLeft: spacing[4] + 30 + spacing[3],
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  uploadingText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  cancelBtn: {
    marginTop: spacing[3],
    minHeight: 48,
    borderRadius: radii.surface,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  simulatorHint: {
    marginTop: spacing[2],
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
});
