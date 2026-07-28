import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, BookOpen, Home } from 'lucide-react-native';
import FlorescerQuadrosIcon from '@/components/icons/FlorescerQuadrosIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveMediaUrl } from '@/lib/media-url';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = {
  open: boolean;
  onClose: () => void;
  courseTitle?: string;
  moduleTitle?: string;
  courseThumbnail?: string;
};

const LINKS = [
  { label: 'Início', href: '/inicio', Icon: Home },
  { label: 'Biblioteca', href: '/conteudo', Icon: BookOpen },
  { label: 'Vídeos', href: '/cursos', Icon: FlorescerQuadrosIcon },
];

export default function PlayerNavigationDrawer({
  open,
  onClose,
  courseTitle,
  moduleTitle,
  courseThumbnail,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cover = resolveMediaUrl(courseThumbnail || '');

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.drawer, { paddingTop: insets.top + spacing[3], paddingBottom: insets.bottom + spacing[4] }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Pressable style={styles.backBtn} onPress={() => { onClose(); router.push('/cursos' as never); }}>
            <ArrowLeft size={16} color={colors.text} />
            <Text style={styles.backText}>Voltar</Text>
          </Pressable>

          <View style={styles.courseCard}>
            <View style={styles.courseThumb}>
              {cover ? (
                <Image source={{ uri: cover }} style={styles.courseThumbImg} resizeMode="cover" />
              ) : (
                <FlorescerQuadrosIcon size={20} color={colors.primaryDark} />
              )}
            </View>
            <View style={styles.courseCopy}>
              <Text style={styles.courseTitle} numberOfLines={2}>{courseTitle || 'Vídeo atual'}</Text>
              <Text style={styles.moduleTitle} numberOfLines={1}>{moduleTitle || 'Módulo'}</Text>
            </View>
          </View>

          <ScrollView>
            {LINKS.map(({ label, href, Icon }) => (
              <Pressable
                key={href}
                style={styles.linkRow}
                onPress={() => {
                  onClose();
                  router.push(href as never);
                }}
              >
                <Icon size={18} color={colors.textMuted} />
                <Text style={styles.linkText}>{label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  drawer: {
    width: '82%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
    borderTopRightRadius: radii.surface,
    borderBottomRightRadius: radii.surface,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing[4],
  },
  backText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  courseCard: {
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radii.control,
    backgroundColor: colors.primarySoft,
    marginBottom: spacing[4],
  },
  courseThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  courseThumbImg: { width: '100%', height: '100%' },
  courseCopy: { flex: 1, gap: 4 },
  courseTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  moduleTitle: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  linkText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
});
