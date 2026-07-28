import { createElement } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { formatLessonSummaryHtml, LESSON_SUMMARY_CSS } from '@/lib/lesson-summary-format';
import { colors, fonts } from '@/theme/tokens';

type Props = {
  content: string;
};

function buildSummaryDocument(html: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><style>${LESSON_SUMMARY_CSS}</style></head><body><div class="resumo-prose">${html}</div></body></html>`;
}

export default function LessonSummaryView({ content }: Props) {
  const html = formatLessonSummaryHtml(content);

  if (!html) {
    return (
      <Text style={styles.empty}>Nenhuma descrição disponível para esta aula.</Text>
    );
  }

  const documentHtml = buildSummaryDocument(html);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrap}>
        {createElement('iframe', {
          srcDoc: documentHtml,
          title: 'Resumo da aula',
          style: {
            width: '100%',
            minHeight: 280,
            border: 'none',
            display: 'block',
          },
        })}
      </View>
    );
  }

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html: documentHtml }}
      style={styles.web}
      scrollEnabled
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { minHeight: 280 },
  web: { flex: 1, minHeight: 280, backgroundColor: 'transparent' },
  empty: { fontFamily: fonts.regular, color: colors.textMuted, lineHeight: 22 },
});
