import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import PatientShell from '@/components/PatientShell';
import CfButton from '@/components/ui/CfButton';
import { colors, fonts, spacing } from '@/theme/tokens';

export default function CheckInConcluidoScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/inicio' as never);
    }, 1200);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <PatientShell withTabClearance={false}>
      <View style={styles.page}>
        <View style={styles.hero}>
          <View style={styles.circle}>
            <Check color="#fff" size={40} />
          </View>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>Check-in concluído!</Text>
          <Text style={styles.text}>
            Você completou todas as perguntas da semana. Continue assim, você está indo muito bem!
          </Text>
        </View>
        <CfButton label="Ver resumo" onPress={() => router.replace('/check-in/resumo' as never)} />
        <CfButton label="Voltar para o início" variant="ghost" onPress={() => router.replace('/inicio' as never)} />
      </View>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', padding: spacing[5], gap: spacing[3] },
  hero: { alignItems: 'center', marginBottom: spacing[5], gap: spacing[2] },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 32 },
  title: { fontFamily: fonts.extrabold, fontSize: 24, textAlign: 'center' },
  text: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});
