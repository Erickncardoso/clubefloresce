import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import CfButton from '@/components/ui/CfButton';
import { useAuth } from '@/providers/AuthProvider';

export default function AbrirScreen() {
  const router = useRouter();
  const { to } = useLocalSearchParams<{ to?: string }>();
  const { refreshUser, resolvePostLoginRoute, hasSession } = useAuth();
  const [checking, setChecking] = useState(true);
  const isIos = Platform.OS === 'ios';

  function resolveTargetPath() {
    const value = typeof to === 'string' ? to.trim() : '';
    if (!value) return null;
    return value.startsWith('/') ? value : `/${value}`;
  }

  async function goToDestination() {
    const valid = hasSession || Boolean(await refreshUser());
    const target = resolveTargetPath();
    const fallback = valid ? await resolvePostLoginRoute() : '/';
    router.replace((target || fallback) as never);
  }

  useEffect(() => {
    (async () => {
      if (hasSession || await refreshUser()) {
        await goToDestination();
        return;
      }
      setChecking(false);
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>{checking ? 'Abrindo...' : 'Bem-vinda ao Clube Florescer'}</Text>
          {checking ? (
            <Text style={styles.lead}>Preparando seu acesso...</Text>
          ) : (
            <>
              <Text style={styles.lead}>
                Toque em entrar para abrir com o e-mail e a senha que você cadastrou.
              </Text>
              <CfButton label="Entrar agora" onPress={goToDestination} />
              {isIos ? (
                <Text style={styles.hint}>
                  Dica: no Safari, toque em Compartilhar e depois em Adicionar à Tela de Início para instalar o app.
                </Text>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { gap: 16, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#e4e4e0', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  lead: { color: '#5f5f5c', lineHeight: 22, textAlign: 'center' },
  hint: { color: '#9ca3af', fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
