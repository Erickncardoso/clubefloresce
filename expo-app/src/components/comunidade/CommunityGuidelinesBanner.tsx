import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { LEGAL_CONTACT_EMAIL } from '@/config/legal';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

/** Regras visíveis da comunidade (Guideline 1.2 — UGC). */
export default function CommunityGuidelinesBanner() {
  return (
    <View style={styles.banner}>
      <ShieldCheck color={colors.primaryDark} size={18} />
      <View style={styles.copy}>
        <Text style={styles.title}>Comunidade segura</Text>
        <Text style={styles.text}>
          Respeite os outros membros. Conteúdo ofensivo, spam ou orientações de saúde inseguras
          podem ser removidos. Use Denunciar ou Bloquear no menu de cada publicação.
        </Text>
        <View style={styles.links}>
          <Link href="/legal/termos" asChild>
            <Pressable>
              <Text style={styles.link}>Termos de uso</Text>
            </Pressable>
          </Link>
          <Text style={styles.dot}>·</Text>
          <Pressable onPress={() => void Linking.openURL(`mailto:${LEGAL_CONTACT_EMAIL}`)}>
            <Text style={styles.link}>Fale conosco</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing[3],
  },
  copy: { flex: 1, gap: spacing[1] },
  title: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  text: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  links: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[1] },
  link: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primaryDark },
  dot: { color: colors.textMuted },
});
