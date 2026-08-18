import { useState, type ReactNode } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import CfButton from '@/components/ui/CfButton';
import FormField from '@/components/ui/FormField';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = {
  /** Se true, só abre o fluxo (Alert + modal). */
  trigger: (open: () => void) => ReactNode;
};

/** Fluxo de exclusão de conta — exigido pela Apple (Guideline 5.1.1). */
export default function DeleteAccountAction({ trigger }: Props) {
  const router = useRouter();
  const { deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function promptDelete() {
    Alert.alert(
      'Excluir conta',
      'Esta ação é permanente. Seus dados de acesso serão removidos e você precisará de um novo cadastro para voltar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', style: 'destructive', onPress: () => setOpen(true) },
      ],
    );
  }

  async function confirmDelete() {
    setError('');
    if (!password.trim()) {
      setError('Informe sua senha para confirmar.');
      return;
    }
    setLoading(true);
    try {
      await deleteAccount(password);
      setOpen(false);
      router.replace('/' as never);
    } catch (err) {
      setError(
        (err as { data?: { message?: string }; message?: string })?.data?.message
          || (err as Error).message
          || 'Não foi possível excluir a conta.',
      );
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    setOpen(false);
    setPassword('');
    setError('');
  }

  return (
    <>
      {trigger(promptDelete)}
      <Modal visible={open} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Confirmar exclusão</Text>
            <Text style={styles.text}>
              Digite sua senha para excluir permanentemente sua conta do Clube Florescer.
            </Text>
            <FormField
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.actions}>
              <CfButton variant="ghost" label="Cancelar" onPress={closeModal} />
              <CfButton
                label={loading ? 'Excluindo…' : 'Excluir conta'}
                loading={loading}
                onPress={confirmDelete}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing[4],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.surface,
    padding: spacing[4],
    gap: spacing[3],
  },
  title: { fontFamily: fonts.bold, fontSize: 18 },
  text: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  error: { color: colors.error, fontFamily: fonts.medium, fontSize: 13 },
  actions: { flexDirection: 'row', gap: spacing[2], justifyContent: 'flex-end' },
});
