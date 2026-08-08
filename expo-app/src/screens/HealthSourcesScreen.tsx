import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import { HEALTH_SOURCES, HEALTH_SOURCES_NOTE } from '@/content/health-sources';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export default function HealthSourcesScreen() {
  return (
    <PatientShell withTabClearance={false}>
      <PatientHeader title="Fontes e referências" showBack showBell={false} showMenu={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.intro}>
          As orientações de alimentação e bem-estar do Clube Florescer se baseiam nas seguintes fontes:
        </Text>

        {HEALTH_SOURCES.map((source) => (
          <Pressable
            key={source.url}
            style={styles.card}
            onPress={() => Linking.openURL(source.url)}
            accessibilityRole="link"
          >
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{source.label}</Text>
              <Text style={styles.cardDesc}>{source.description}</Text>
              <Text style={styles.cardUrl} numberOfLines={1}>{source.url}</Text>
            </View>
            <ExternalLink color={colors.primaryDark} size={18} strokeWidth={2} />
          </Pressable>
        ))}

        <Text style={styles.note}>{HEALTH_SOURCES_NOTE}</Text>
      </ScrollView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: spacing[6], gap: spacing[3] },
  intro: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    marginBottom: spacing[2],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardCopy: { flex: 1, minWidth: 0, gap: 3 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  cardDesc: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  cardUrl: { fontFamily: fonts.medium, fontSize: 11, color: colors.primaryDark },
  note: {
    marginTop: spacing[3],
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
