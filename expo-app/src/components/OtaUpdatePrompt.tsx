import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useOtaUpdateCheck } from '@/hooks/useOtaUpdateCheck';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export default function OtaUpdatePrompt() {
  const { ready, downloading, applying, applyUpdate, dismiss } = useOtaUpdateCheck();
  const visible = ready || downloading || applying;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={applying ? undefined : dismiss}
    >
      <View style={styles.overlay} accessibilityRole="alert">
        <View style={styles.dialog}>
          {applying || downloading ? (
            <>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.title}>{applying ? 'Atualizando o app' : 'Baixando atualização'}</Text>
              <Text style={styles.copy}>
                {applying ? 'Isso leva só alguns segundos.' : 'Já já você pode aplicar.'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>Nova atualização</Text>
              <Text style={styles.copy}>
                Tem uma versão nova pronta. Toque em Atualizar para aplicar agora.
              </Text>
              <View style={styles.actions}>
                <Pressable style={styles.secondary} onPress={dismiss}>
                  <Text style={styles.secondaryText}>Agora não</Text>
                </Pressable>
                <Pressable style={styles.primary} onPress={() => void applyUpdate()}>
                  <Text style={styles.primaryText}>Atualizar</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[5],
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  dialog: {
    width: '100%',
    maxWidth: 320,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  copy: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginTop: spacing[2],
  },
  secondary: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  secondaryText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.textMuted,
  },
  primary: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radii.control,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  primaryText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#fff',
  },
});
