import {
  StyleSheet,
  Text,
  View
} from 'react-native';
import { usePathname } from 'expo-router';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientScrollView from '@/components/ui/PatientScrollView';
import PatientShell from '@/components/PatientShell';
import { LEGAL_DOCUMENTS, type LegalDocumentKey } from '@/content/legal-pt';
import { colors, fonts, spacing } from '@/theme/tokens';

export default function LegalDocumentScreen() {
  const pathname = usePathname();
  const key: LegalDocumentKey = pathname.includes('termos') ? 'termos' : 'privacidade';
  const document = LEGAL_DOCUMENTS[key];

  return (
    <PatientShell withTabClearance={false}>
      <PatientHeader />
      <PatientScrollView style={styles.scrollView} contentContainerStyle={styles.scroll}>
        <Text style={styles.updated}>Atualizado em {document.updatedAt}</Text>
        {document.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </PatientScrollView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scroll: { padding: spacing[4], paddingBottom: spacing[6], gap: spacing[4] },
  updated: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  section: { gap: spacing[2] },
  heading: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
  },
});
