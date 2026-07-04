import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { ArrowUp, Paperclip, Sparkles } from 'lucide-react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import { BELLA_ACTIONS } from '@/lib/bella-actions';
import { firstNameFrom } from '@/lib/format';
import { patientAssets } from '@/lib/patient-assets';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export default function BellaHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = firstNameFrom(user?.name);

  function handleAction(action: (typeof BELLA_ACTIONS)[number]) {
    if (action.route) {
      router.push(action.route as never);
      return;
    }
    router.push(`/bella/chat/${action.id}` as never);
  }

  return (
    <PatientShell>
      <PatientHeader title="Bella" showBack={false} showBell={false} showMenu={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Image source={patientAssets.bellaAvatar} style={styles.avatarImg} resizeMode="cover" />
            </View>
            <View style={styles.badge}>
              <Sparkles color="#fff" size={12} />
            </View>
          </View>
          <Text style={styles.greeting}>Olá, {firstName}!</Text>
          <Text style={styles.headline}>O que vamos{'\n'}analisar hoje?</Text>
        </View>

        <View style={styles.chips}>
          {BELLA_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Pressable key={action.id} style={styles.chip} onPress={() => handleAction(action)}>
                <Icon color={colors.primaryDark} size={18} />
                <Text style={styles.chipText}>{action.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Link href="/bella/chat/general" asChild>
          <Pressable style={styles.cta}>
            <Text style={styles.ctaPlaceholder}>Pergunte algo para a Bella...</Text>
            <View style={styles.ctaActions}>
              <Paperclip color={colors.textMuted} size={18} />
              <View style={styles.send}>
                <ArrowUp color="#fff" size={16} />
              </View>
            </View>
          </Pressable>
        </Link>
      </ScrollView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[5], paddingBottom: spacing[6], gap: spacing[5] },
  hero: { alignItems: 'center', gap: spacing[2], paddingVertical: spacing[4] },
  avatarWrap: { position: 'relative', marginBottom: spacing[3] },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#c17b80',
    borderWidth: 2,
    borderColor: '#f8f8fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { fontFamily: fonts.medium, color: colors.textMuted },
  headline: { fontFamily: fonts.bold, fontSize: 26, textAlign: 'center', lineHeight: 32 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.pill,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 13 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  ctaPlaceholder: { fontFamily: fonts.regular, color: colors.placeholder, flex: 1 },
  ctaActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  send: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
