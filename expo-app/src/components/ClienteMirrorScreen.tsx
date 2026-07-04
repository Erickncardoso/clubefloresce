import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ClienteScreenMeta } from '@/lib/cliente-screen-map';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = ClienteScreenMeta & {
  title?: string;
};

/** Placeholder de migração — UI será portada tela a tela do `cliente/`. */
export default function ClienteMirrorScreen({
  route,
  sourceFile,
  layout = 'patient',
  middleware = [],
  title,
}: Props) {
  useEffect(() => {
    if (__DEV__) {
      console.log(`[expo-app] mirror ${route} ← ${sourceFile}`);
    }
  }, [route, sourceFile]);

  const screenTitle = title || route.replace(/^\//, '') || 'Clube Florescer';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.card}>
        <Text style={styles.kicker}>Espelho do cliente PWA</Text>
        <Text style={styles.title}>{screenTitle}</Text>
        <Text style={styles.route}>{route}</Text>
        <Text style={styles.meta}>Fonte: {sourceFile}</Text>
        <Text style={styles.meta}>Layout: {layout}</Text>
        {middleware.length > 0 ? (
          <Text style={styles.meta}>Middleware: {middleware.join(', ')}</Text>
        ) : null}
        <View style={styles.pending}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.pendingText}>UI em migração — mesma rota e regras do PWA</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[5],
    gap: spacing[2],
  },
  kicker: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
  },
  route: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  pending: {
    marginTop: spacing[4],
    alignItems: 'center',
    gap: spacing[3],
  },
  pendingText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
