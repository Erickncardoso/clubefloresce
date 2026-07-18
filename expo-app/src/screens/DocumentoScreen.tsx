import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import CfButton from '@/components/ui/CfButton';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { resolveDocumentSrcFromRoute, toAbsoluteDocumentUrl } from '@/lib/patient-document';
import { colors, fonts, spacing } from '@/theme/tokens';

export default function DocumentoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ src?: string; title?: string; from?: string; token?: string }>();

  const backTo = typeof params.from === 'string' && params.from.startsWith('/')
    ? params.from
    : '/cursos';

  const pageTitle = typeof params.title === 'string' && params.title.trim()
    ? params.title.trim()
    : 'Material PDF';

  const documentSrc = useMemo(
    () => resolveDocumentSrcFromRoute(params as Record<string, unknown>),
    [params],
  );

  const viewerUrl = documentSrc
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(toAbsoluteDocumentUrl(documentSrc))}&embedded=true`
    : '';

  if (!documentSrc) {
    return (
      <PatientShell withTabClearance={false}>
        <PatientHeader title={pageTitle} showBack backTo={backTo} showBell={false} showMenu={false} />
        <View style={styles.state}>
          <Text style={styles.stateText}>Documento indisponível.</Text>
          <CfButton label="Voltar" variant="ghost" onPress={() => router.replace(backTo as never)} />
        </View>
      </PatientShell>
    );
  }

  return (
    <PatientShell withTabClearance={false}>
      <PatientHeader title={pageTitle} showBack backTo={backTo} showBell={false} showMenu={false} />
      {viewerUrl ? (
        <WebView
          source={{ uri: viewerUrl }}
          style={styles.web}
          originWhitelist={['*']}
          javaScriptEnabled
          startInLoadingState
          renderLoading={() => <LoadingScreen />}
        />
      ) : (
        <View style={styles.state}>
          <Text style={styles.stateText}>Link do documento inválido ou expirado.</Text>
        </View>
      )}
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: '#fff' },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[5], gap: spacing[4] },
  stateText: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
});
