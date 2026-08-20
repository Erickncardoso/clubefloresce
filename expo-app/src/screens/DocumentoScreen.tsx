import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DocumentViewer from '@/components/document/DocumentViewer';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import CfButton from '@/components/ui/CfButton';
import { resolveDocumentSrcFromRoute } from '@/lib/patient-document';
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

  if (!documentSrc) {
    return (
      <PatientShell withTabClearance={false}>
        <PatientHeader />
        <View style={styles.state}>
          <Text style={styles.stateText}>Documento indisponível.</Text>
          <CfButton label="Voltar" variant="ghost" onPress={() => router.replace(backTo as never)} />
        </View>
      </PatientShell>
    );
  }

  return (
    <PatientShell withTabClearance={false}>
      <PatientHeader />
      <DocumentViewer documentSrc={documentSrc} title={pageTitle} />
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[5], gap: spacing[4] },
  stateText: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
});
