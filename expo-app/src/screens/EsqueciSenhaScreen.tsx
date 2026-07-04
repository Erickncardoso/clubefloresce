import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { AlertCircle, ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CfButton from '@/components/ui/CfButton';
import FormField from '@/components/ui/FormField';
import { apiFetch } from '@/lib/api';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export default function EsqueciSenhaScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            {!submitted ? (
              <>
                <Link href="/" asChild>
                  <View style={styles.back}>
                    <ArrowLeft color={colors.primary} size={18} />
                    <Text style={styles.backText}>Voltar</Text>
                  </View>
                </Link>
                <Text style={styles.title}>Recuperar senha</Text>
                <Text style={styles.sub}>Informe seu e-mail. O link expira em 10 minutos.</Text>
                <FormField
                  label="E-mail"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="seu@email.com"
                />
                {error ? (
                  <View style={styles.errorBox}>
                    <AlertCircle color={colors.error} size={18} />
                    <Text style={styles.error}>{error}</Text>
                  </View>
                ) : null}
                <CfButton label="Enviar link" loading={loading} onPress={handleSubmit} />
              </>
            ) : (
              <>
                <Text style={styles.title}>Verifique seu e-mail</Text>
                <Text style={styles.sub}>
                  Se o e-mail estiver cadastrado, você receberá um link em instantes. Confira também a caixa de spam.
                </Text>
                <Link href="/" asChild>
                  <CfButton label="Voltar ao login" />
                </Link>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing[5] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[5],
    gap: spacing[4],
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontFamily: fonts.semibold, color: colors.primary },
  title: { fontFamily: fonts.bold, fontSize: 24 },
  sub: { fontFamily: fonts.regular, color: colors.textMuted, lineHeight: 20 },
  errorBox: { flexDirection: 'row', gap: spacing[2], alignItems: 'center' },
  error: { color: colors.error, fontFamily: fonts.medium, flex: 1 },
});
