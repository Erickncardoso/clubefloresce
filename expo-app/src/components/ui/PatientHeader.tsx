import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { Bell, ChevronLeft, Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '@/theme/tokens';

type Props = {
  title?: string;
  showBack?: boolean;
  backTo?: string;
  showBell?: boolean;
  showMenu?: boolean;
  menuLeft?: boolean;
  light?: boolean;
  style?: ViewStyle;
  actions?: ReactNode;
  subtitle?: string;
};

/** Espelha `frontend/components/PatientHeader.vue` — voltar estilo iOS (chevron + pill verde). */
export default function PatientHeader({
  title,
  showBack = false,
  backTo = '',
  showBell = true,
  showMenu = true,
  menuLeft = false,
  light = false,
  style,
  actions,
  subtitle,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fg = light ? '#fff' : colors.text;
  const muted = light ? 'rgba(255,255,255,0.7)' : colors.textMuted;
  const showMenuButton = showMenu && (menuLeft || !showBack);
  const showBackButton = showBack && !menuLeft;

  function goBack() {
    if (backTo) {
      router.push(backTo as never);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.push('/inicio' as never);
  }

  function renderStart() {
    if (showMenuButton && menuLeft) {
      return (
        <Pressable accessibilityRole="button" accessibilityLabel="Menu" style={styles.iconBtn}>
          <Menu color={fg} size={20} strokeWidth={1.75} />
        </Pressable>
      );
    }
    if (showBackButton) {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={styles.backBtn}
          onPress={goBack}
        >
          <ChevronLeft color={colors.text} size={18} strokeWidth={2.1} />
        </Pressable>
      );
    }
    return <View style={styles.startSpacer} />;
  }

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top + spacing[2] },
        !light && styles.wrapSolid,
        style,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.start}>{renderStart()}</View>

        <View style={styles.brand} pointerEvents="none">
          {title ? (
            <Text style={[styles.title, { color: fg }]} numberOfLines={1}>{title}</Text>
          ) : (
            <Text style={[styles.brandMark, { color: muted }]}>Clube Florescer</Text>
          )}
        </View>

        <View style={styles.end}>
          {actions ? (
            <View style={styles.iconBtn}>{actions}</View>
          ) : showBell ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notificações"
              style={styles.iconBtn}
              onPress={() => router.push('/perfil/notificacoes' as never)}
            >
              <Bell color={fg} size={20} strokeWidth={1.75} />
            </Pressable>
          ) : showMenuButton && !menuLeft ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Menu" style={styles.iconBtn}>
              <Menu color={fg} size={20} strokeWidth={1.75} />
            </Pressable>
          ) : (
            <View style={styles.startSpacer} />
          )}
        </View>
      </View>
      {subtitle ? <Text style={[styles.subtitle, { color: muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: 'transparent',
  },
  wrapSolid: {
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  start: {
    minWidth: 44,
    zIndex: 1,
  },
  end: {
    minWidth: 44,
    alignItems: 'flex-end',
    zIndex: 1,
  },
  brand: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 88,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    textAlign: 'center',
  },
  brandMark: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startSpacer: {
    width: 44,
    height: 44,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
