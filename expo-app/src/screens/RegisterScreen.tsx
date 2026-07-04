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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
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
      const next = data.redirectTo || (await resolvePostLoginRoute()) || '/assinatura';
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
            <Text style={styles.sub}>
              Cadastre-se e finalize o pagamento para liberar seu acesso ao Clube Florescer.
            </Text>

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
              hint="Obrigatório — usaremos para avisos da sua assinatura"
            />

            <CfButton
              label={loading ? 'Criando conta…' : 'Criar conta e ir ao pagamento'}
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
});
