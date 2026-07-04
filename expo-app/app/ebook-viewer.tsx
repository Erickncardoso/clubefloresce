import { useLocalSearchParams, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { X } from 'lucide-react-native';
import { colors, fonts, spacing } from '@/theme/tokens';

export default function EbookViewerScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>();
  const insets = useSafeAreaInsets();

  const viewerUrl = url
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
    : '';

  return (
    <View style={styles.shell}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={12}>
          <X color={colors.text} size={22} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{title ?? 'E-book'}</Text>
        <View style={styles.closeBtn} />
      </View>
      {viewerUrl ? (
        <WebView
          source={{ uri: viewerUrl }}
          style={styles.web}
          originWhitelist={['*']}
          javaScriptEnabled
          startInLoadingState
          scalesPageToFit
        />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>URL inválida.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 16, textAlign: 'center', color: colors.text },
  web: { flex: 1, backgroundColor: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.regular, color: colors.textMuted },
});
