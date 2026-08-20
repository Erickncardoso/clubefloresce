import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CfButton from '@/components/ui/CfButton';
import FloatField from '@/components/ui/FloatField';
import FormField from '@/components/ui/FormField';
import { useAuth } from '@/providers/AuthProvider';
import {
  getAccessExpiredMessage,
  getPaymentRequiredMessage,
} from '@/lib/platform-billing';
import { BrandLogo } from '@/components/BrandLogo';
import { getApiBase } from '@/config/env';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

/** Porta `cliente/pages/index.vue` (login). */
export default function LoginScreen() {
  const router = useRouter();
  const { booting, hasSession, login, resolvePostLoginRoute, changeFirstAccessPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [firstAccessOpen, setFirstAccessOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstAccessLoading, setFirstAccessLoading] = useState(false);
  const [firstAccessError, setFirstAccessError] = useState('');

  async function handleLogin() {
    setLoading(true);
    setError('');
    try {
      const result = await login(email.trim(), password);
      if (result.mustChangePassword) {
        setFirstAccessOpen(true);
        return;
      }
      const next = await resolvePostLoginRoute();
      router.replace(next as never);
    } catch (err) {
      const message = (err as { data?: { message?: string }; message?: string })?.data?.message
        || (err as Error).message
        || 'Não foi possível entrar. Verifique e-mail e senha.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFirstAccessPasswordChange() {
    setFirstAccessError('');
    if (newPassword.length < 8) {
      setFirstAccessError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFirstAccessError('As senhas não coincidem.');
      return;
    }
    setFirstAccessLoading(true);
    try {
      await changeFirstAccessPassword(newPassword);
      setFirstAccessOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      const next = await resolvePostLoginRoute();
      router.replace(next as never);
    } catch (err) {
      setFirstAccessError(
        (err as { data?: { message?: string }; message?: string })?.data?.message
          || (err as Error).message
          || 'Não foi possível alterar a senha.',
      );
    } finally {
      setFirstAccessLoading(false);
    }
  }

  if (booting) {
    return (
      <SafeAreaView style={styles.boot}>
        <ActivityIndicator size="large" color={colors.primary} />
        {!hasSession ? (
          <Text style={styles.bootText}>Carregando sua conta…</Text>
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <BrandLogo size="xl" animated />
          <Text style={styles.title}>Entrar</Text>

          <FloatField
            label="E-mail"
            leftIcon={Mail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
          />

          <FloatField
            label="Senha"
            leftIcon={Lock}
            autoCapitalize="none"
            autoComplete="password"
            placeholder="Sua senha de acesso"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            rightAccessory={(
              <Pressable
                accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                onPress={() => setShowPassword((value) => !value)}
              >
                {showPassword ? (
                  <EyeOff size={18} color={colors.inputIcon} />
                ) : (
                  <Eye size={18} color={colors.inputIcon} />
                )}
              </Pressable>
            )}
            footer={(
              <Link href="/esqueci-senha" style={styles.forgot}>
                Esqueci a senha
              </Link>
            )}
          />

          <Pressable
            disabled={loading}
            style={[styles.submit, loading && styles.submitDisabled]}
            onPress={handleLogin}
          >
            <Text style={styles.submitText}>{loading ? 'Validando…' : 'Entrar'}</Text>
          </Pressable>

          {error ? (
            <View style={styles.errorBox}>
              <AlertCircle size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.footer}>
            Primeiro acesso?{' '}
            <Link href="/register" style={styles.footerLink}>
              Criar conta
            </Link>
          </Text>

          {__DEV__ ? (
            <Text style={styles.devHint} selectable>
              API: {getApiBase()}
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <Modal visible={firstAccessOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Primeiro acesso</Text>
            <Text style={styles.modalLead}>
              Por segurança, crie uma nova senha para continuar.
            </Text>
            <FormField
              label="Nova senha"
              leftIcon={Lock}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Mínimo 8 caracteres"
            />
            <FormField
              label="Confirmar nova senha"
              leftIcon={Lock}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Repita a nova senha"
            />
            {firstAccessError ? (
              <View style={styles.errorBox}>
                <AlertCircle size={18} color={colors.error} />
                <Text style={styles.errorText}>{firstAccessError}</Text>
              </View>
            ) : null}
            <CfButton
              label={firstAccessLoading ? 'Salvando…' : 'Salvar nova senha'}
              loading={firstAccessLoading}
              onPress={handleFirstAccessPasswordChange}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export function loginAccessMessage(access?: string | string[]): string | null {
  if (access === 'expired') return getAccessExpiredMessage();
  if (access === 'payment') return getPaymentRequiredMessage();
  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1, justifyContent: 'center', padding: spacing[4] },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    backgroundColor: colors.bg,
  },
  bootText: {
    fontFamily: fonts.medium,
    color: colors.textMuted,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[5],
    gap: spacing[4],
    overflow: 'visible',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
  },
  forgot: {
    alignSelf: 'flex-end',
    marginTop: spacing[2],
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.primary,
  },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: radii.control,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitText: {
    fontFamily: fonts.bold,
    color: '#fff',
    fontSize: 16,
  },
  errorBox: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'flex-start',
    backgroundColor: colors.errorSoft,
    borderRadius: radii.control,
    padding: spacing[3],
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.medium,
    color: colors.error,
    fontSize: 14,
  },
  footer: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    color: colors.textMuted,
    fontSize: 14,
  },
  footerLink: {
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  devHint: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    color: colors.textMuted,
    fontSize: 11,
    opacity: 0.85,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing[4],
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[5],
    gap: spacing[3],
    overflow: 'visible',
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
  },
  modalLead: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
