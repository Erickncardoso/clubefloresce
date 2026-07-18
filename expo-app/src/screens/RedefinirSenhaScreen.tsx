import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CfButton from '@/components/ui/CfButton';
import FormField from '@/components/ui/FormField';
import { apiFetch } from '@/lib/api';

export default function RedefinirSenhaScreen() {
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();
  const token = typeof tokenParam === 'string' ? tokenParam : '';

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [invalidMessage, setInvalidMessage] = useState('Link inválido ou expirado.');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const headerTitle = useMemo(() => {
    if (done) return 'Pronto!';
    if (!tokenValid && !checking) return 'Link expirado';
    return 'Nova senha';
  }, [checking, done, tokenValid]);

  useEffect(() => {
    (async () => {
      if (!token) {
        setInvalidMessage('Link inválido. Solicite um novo e-mail de recuperação.');
        setChecking(false);
        return;
      }
      try {
        await apiFetch(`/auth/password-reset/validate?token=${encodeURIComponent(token)}`);
        setTokenValid(true);
      } catch (err) {
        setInvalidMessage((err as Error).message || 'Link inválido ou expirado.');
      } finally {
        setChecking(false);
      }
    })();
  }, [token]);

  async function handleSubmit() {
    setError('');
    if (password !== confirmPassword) {
      setError('A confirmação precisa ser igual à nova senha.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
      });
      setDone(true);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.title}>{headerTitle}</Text>
            {checking ? (
              <Text style={styles.sub}>Validando link...</Text>
            ) : null}

            {!checking && !tokenValid ? (
              <>
                <Text style={styles.sub}>{invalidMessage}</Text>
                <Link href="/esqueci-senha" asChild><CfButton label="Solicitar novo link" /></Link>
              </>
            ) : null}

            {done ? (
              <>
                <Text style={styles.sub}>Senha redefinida com sucesso.</Text>
                <Link href="/" asChild><CfButton label="Entrar no app" /></Link>
              </>
            ) : null}

            {!checking && tokenValid && !done ? (
              <>
                <Text style={styles.sub}>Escolha uma nova senha para entrar no app.</Text>
                <FormField
                  label="Nova senha"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Mínimo 8 caracteres"
                />
                <FormField
                  label="Confirmar senha"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Repita a nova senha"
                />
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Mostrar senha</Text>
                  <CfButton
                    label={showPassword ? 'Ocultar' : 'Mostrar'}
                    variant="ghost"
                    onPress={() => setShowPassword((v) => !v)}
                  />
                </View>
                {error ? (
                  <View style={styles.errorBox}>
                    <AlertCircle color="#b42318" size={18} />
                    <Text style={styles.error}>{error}</Text>
                  </View>
                ) : null}
                <CfButton label="Redefinir senha" loading={loading} onPress={handleSubmit} />
              </>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { gap: 16, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#e4e4e0' },
  title: { fontSize: 24, fontWeight: '700' },
  sub: { color: '#5f5f5c', lineHeight: 20 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { color: '#5f5f5c' },
  errorBox: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  error: { color: '#b42318', flex: 1 },
});
