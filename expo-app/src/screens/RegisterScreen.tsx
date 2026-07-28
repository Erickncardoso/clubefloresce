import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { AlertCircle, ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CfButton from '@/components/ui/CfButton';
import FormField from '@/components/ui/FormField';
import { maskPhoneBr, onlyDigits } from '@/lib/masks';
import { getRegisterSubtitle } from '@/lib/platform-billing';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, resolvePostLoginRoute } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    if (!acceptedTerms) {
      setError('Aceite os Termos de Uso e a Política de Privacidade para continuar.');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('As senhas não coincidem.');
      return;
    }
    const digits = onlyDigits(phone, 11);
    if (digits.length < 10) {
      setError('Informe um WhatsApp válido com DDD.');
      return;
    }

    setLoading(true);
    try {
      const data = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        passwordConfirm,
        phone: maskPhoneBr(phone),
      });
      const next = data.redirectTo || (await resolvePostLoginRoute()) || '/inicio';
      router.replace(next as never);
    } catch (err) {
      setError((err as { data?: { message?: string }; message?: string })?.data?.message
        || (err as Error).message
        || 'Não foi possível criar sua conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Link href="/" asChild>
            <Pressable style={styles.back}>
              <ArrowLeft size={16} color={colors.textMuted} />
              <Text style={styles.backText}>Voltar</Text>
            </Pressable>
          </Link>

          <View style={styles.card}>
            <Text style={styles.title}>Criar sua conta</Text>
            <Text style={styles.sub}>{getRegisterSubtitle()}</Text>

            <FormField label="Nome completo" value={name} onChangeText={setName} autoCapitalize="words" />
            <FormField
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <FormField
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              hint="Mínimo 8 caracteres"
            />
            <FormField
              label="Confirmar senha"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry
            />
            <FormField
              label="WhatsApp"
              value={phone}
              onChangeText={(value) => setPhone(maskPhoneBr(value))}
              keyboardType="phone-pad"
              hint="Obrigatório — usaremos para avisos importantes"
            />

            <Pressable
              style={styles.termsRow}
              onPress={() => setAcceptedTerms((value) => !value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTerms }}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxOn]}>
                {acceptedTerms ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={styles.termsText}>
                Li e aceito os{' '}
                <Link href="/legal/termos" style={styles.link}>Termos de Uso</Link>
                {' '}e a{' '}
                <Link href="/legal/privacidade" style={styles.link}>Política de Privacidade</Link>.
              </Text>
            </Pressable>

            <CfButton
              label={loading ? 'Criando conta…' : 'Criar conta'}
              loading={loading}
              onPress={handleSubmit}
            />

            {error ? (
              <View style={styles.errorBox}>
                <AlertCircle size={18} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.footer}>
              Já tem acesso? <Link href="/" style={styles.link}>Entrar no app</Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { padding: spacing[4], gap: spacing[4] },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[5],
    gap: spacing[4],
  },
  title: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  errorBox: {
    flexDirection: 'row',
    gap: spacing[2],
    backgroundColor: colors.errorSoft,
    borderRadius: radii.control,
    padding: spacing[3],
  },
  errorText: { flex: 1, fontFamily: fonts.medium, color: colors.error, fontSize: 14 },
  footer: { textAlign: 'center', fontFamily: fonts.regular, color: colors.textMuted },
  link: { fontFamily: fonts.bold, color: colors.primary },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: '#fff', fontFamily: fonts.bold, fontSize: 12 },
  termsText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, lineHeight: 20 },
});
