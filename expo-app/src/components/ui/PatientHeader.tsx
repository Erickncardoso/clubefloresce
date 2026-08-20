import { useEffect } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PatientHeaderDailyChip from '@/components/home/PatientHeaderDailyChip';
import PatientAvatar from '@/components/ui/PatientAvatar';
import { usePatientDailyHeader } from '@/hooks/usePatientDailyHeader';
import { resolveMediaUrl } from '@/lib/media-url';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme/tokens';

type Props = {
  style?: ViewStyle;
};

/** Header padrão do app paciente: menu + streak à esquerda, avatar à direita. */
export default function PatientHeader({ style }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activeStreak, bootstrapDailyHeader } = usePatientDailyHeader();
  const avatarUrl = resolveMediaUrl(user?.avatar);

  useEffect(() => {
    void bootstrapDailyHeader();
  }, [bootstrapDailyHeader]);

  function openMenu() {
    router.push('/menu' as never);
  }

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top + spacing[2] },
        style,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.start}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Menu"
            style={styles.iconBtn}
            onPress={openMenu}
          >
            <Menu color={colors.text} size={22} strokeWidth={1.75} />
          </Pressable>
          <PatientHeaderDailyChip activeStreak={activeStreak} />
        </View>

        <Link href="/perfil/configuracoes" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir configurações"
            style={styles.avatarBtn}
          >
            <PatientAvatar src={avatarUrl} name={user?.name} size="sm" />
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  start: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
