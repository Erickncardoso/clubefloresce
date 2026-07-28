import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { ChevronRight, ShieldCheck } from 'lucide-react-native';
import { colors, fonts, radii, spacing } from '@/theme/tokens';
import {
  getHomePreviewBannerText,
  getHomePreviewBannerTitle,
  prefersInAppSubscriptionScreen,
} from '@/lib/platform-billing';

/** Banner para plano limitado — reforça utilidade mínima (Guideline 4.2). */
export default function HomeAccessPreviewBanner() {
  return (
    <View style={styles.banner}>
      <ShieldCheck color={colors.primaryDark} size={20} />
      <View style={styles.copy}>
        <Text style={styles.title}>{getHomePreviewBannerTitle()}</Text>
        <Text style={styles.text}>{getHomePreviewBannerText()}</Text>
        <Link href="/assinatura" asChild>
          <Pressable style={styles.link}>
            <Text style={styles.linkText}>
              {prefersInAppSubscriptionScreen() ? 'Ver status da assinatura' : 'Ver planos'}
            </Text>
            <ChevronRight color={colors.primaryDark} size={14} strokeWidth={2} />
          </Pressable>
        </Link>
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
    backgroundColor: 'rgba(139, 150, 124, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(139, 150, 124, 0.24)',
  },
  copy: { flex: 1, gap: spacing[1] },
  title: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  text: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: spacing[1] },
  linkText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primaryDark },
});
