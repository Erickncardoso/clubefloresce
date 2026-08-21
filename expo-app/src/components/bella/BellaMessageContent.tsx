import { StyleSheet, Text, View } from 'react-native';
import {
  parseBellaMarkdown,
  type BellaContentBlock,
  type BellaInlinePart,
} from '@/lib/bella-message-format';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = {
  content: string;
  isUser?: boolean;
};

function InlineParts({
  parts,
  isUser,
  style,
}: {
  parts: BellaInlinePart[];
  isUser?: boolean;
  style?: object;
}) {
  return (
    <Text style={[styles.base, isUser && styles.user, style]}>
      {parts.map((part, index) => (
        <Text
          key={`${part.kind}-${index}`}
          style={part.kind === 'bold' ? styles.bold : undefined}
        >
          {part.text}
        </Text>
      ))}
    </Text>
  );
}

function BlockView({ block, isUser }: { block: BellaContentBlock; isUser?: boolean }) {
  if (block.type === 'heading') {
    const isWarning = block.text === 'Atenção';
    const isTotals =
      block.text === 'Total desta refeição' ||
      block.text === 'Projeção do dia' ||
      block.text === 'Seu dia até agora';

    return (
      <Text
        style={[
          styles.heading,
          block.level === 3 && styles.subheading,
          block.classification && styles.classification,
          isWarning && styles.warningHeading,
          isTotals && styles.totalsHeading,
          isUser && styles.user,
        ]}
      >
        <InlineParts parts={block.parts} isUser={isUser} />
      </Text>
    );
  }

  if (block.type === 'list') {
    return (
      <View style={styles.list}>
        {block.items.map((item, index) => (
          <View key={`${item.text}-${index}`} style={styles.listItem}>
            <Text style={[styles.bullet, isUser && styles.user]}>
              {block.ordered ? `${index + 1}.` : '•'}
            </Text>
            <View style={styles.listBody}>
              <InlineParts parts={item.parts} isUser={isUser} style={styles.listText} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  const isCallout =
    /ainda não (está|estão) na base|ingrediente por ingrediente|acima da meta/i.test(block.text);

  if (isCallout) {
    return (
      <View style={styles.callout}>
        <InlineParts parts={block.parts} isUser={isUser} style={styles.calloutText} />
      </View>
    );
  }

  return (
    <View style={styles.paragraph}>
      <InlineParts parts={block.parts} isUser={isUser} />
    </View>
  );
}

/** Renderiza markdown leve da Bella (##, listas, **negrito**) no chat nativo. */
export default function BellaMessageContent({ content, isUser = false }: Props) {
  const blocks = parseBellaMarkdown(content);
  if (!blocks.length) {
    return <Text style={[styles.base, isUser && styles.user]}>{content}</Text>;
  }

  return (
    <View style={styles.root}>
      {blocks.map((block, index) => (
        <BlockView key={`${block.type}-${index}`} block={block} isUser={isUser} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing[2],
  },
  base: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  user: {
    color: colors.text,
  },
  bold: {
    fontFamily: fonts.semibold,
  },
  heading: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 21,
    color: colors.primaryDark,
    marginTop: 6,
  },
  subheading: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  classification: {
    color: colors.primaryDark,
  },
  warningHeading: {
    color: '#9a6b1f',
    marginTop: 8,
  },
  totalsHeading: {
    marginTop: 10,
  },
  paragraph: {
    marginTop: 0,
  },
  callout: {
    marginTop: 2,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.control,
    backgroundColor: '#f7f1e4',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6d7b8',
  },
  calloutText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6b5428',
  },
  list: {
    gap: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.primaryDark,
    minWidth: 16,
  },
  listBody: {
    flex: 1,
    minWidth: 0,
  },
  listText: {
    lineHeight: 21,
  },
});
