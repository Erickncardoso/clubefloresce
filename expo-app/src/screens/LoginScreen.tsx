import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/AuthProvider';
import {
  PATIENT_ACCESS_EXPIRED_MESSAGE,
  PATIENT_PAYMENT_REQUIRED_MESSAGE,
} from '@/lib/patient-access';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

/** Porta `cliente/pages/index.vue` (login). */
export default function LoginScreen() {
  const router = useRouter();
  const { booting, login, resolvePostLoginRoute } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setLoading(true);
    setError('');
    try {
      const result = await login(email.trim(), password);
      if (result.mustChangePassword) {
        setError('Primeiro acesso: troca de senha será portada na próxima etapa.');
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

  if (booting) {
    return (
      <SafeAreaView style={styles.boot}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.bootText}>Carregando sua conta…</Text>
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
          <Text style={styles.brand}>Clube Florescer</Text>
          <Text style={styles.title}>Entrar</Text>

          <View style={styles.field}>
            <Text style={styles.label}>E-mail</Text>
            <View style={styles.inputWrap}>
              <Mail size={18} color={colors.inputIcon} />
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="seu@email.com"
                placeholderTextColor={colors.placeholder}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputWrap}>
              <Lock size={18} color={colors.inputIcon} />
              <TextInput
                autoCapitalize="none"
                autoComplete="password"
                placeholder="Sua senha de acesso"
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!showPassword}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />
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
            </View>
            <Link href="/esqueci-senha" style={styles.forgot}>
              Esqueci a senha
            </Link>
          </View>

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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function loginAccessMessage(access?: string | string[]): string | null {
  if (access === 'expired') return PATIENT_ACCESS_EXPIRED_MESSAGE;
  if (access === 'payment') return PATIENT_PAYMENT_REQUIRED_MESSAGE;
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
  },
  brand: {
    fontFamily: fonts.extrabold,
    fontSize: 14,
    color: colors.primary,
    textAlign: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
  },
  field: { gap: spacing[2] },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: spacing[3],
    minHeight: 48,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing[2],
  },
  forgot: {
    alignSelf: 'flex-end',
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
});
