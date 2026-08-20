import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { formatStatValue } from '@/lib/format';
import { colors, fonts, radii } from '@/theme/tokens';

export type MealUploadEntry = {
  id: string;
  mealType?: string;
  mealLabel?: string;
  caloriesKcal?: number;
  carbsG?: number;
  proteinG?: number;
  fatG?: number;
  imageUrl?: string | null;
  createdAt?: string;
};

type Props = {
  entries: MealUploadEntry[];
  readOnly?: boolean;
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Café da manhã',
  morning_snack: 'Lanche da manhã',
  lunch: 'Almoço',
  afternoon_snack: 'Lanche da tarde',
  dinner: 'Jantar',
  supper: 'Ceia',
  other: 'Refeição',
};

function entryLabel(entry: MealUploadEntry) {
  return entry?.mealLabel || MEAL_LABELS[entry?.mealType || ''] || 'Refeição';
}

function formatTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

function MealRow({
  entry,
  showChevron,
}: {
  entry: MealUploadEntry;
  showChevron: boolean;
}) {
  const macros = [
    { key: 'p', label: 'prot', value: entry.proteinG },
    { key: 'c', label: 'carb', value: entry.carbsG },
    { key: 'g', label: 'gord', value: entry.fatG },
  ];

  return (
    <View style={styles.row}>
      {entry.imageUrl ? (
        <Image
          source={{ uri: entry.imageUrl }}
          style={styles.image}
          resizeMode="cover"
          accessibilityLabel={`Foto de ${entryLabel(entry)}`}
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]} />
      )}

      <View style={styles.body}>
        <View style={styles.head}>
          <Text style={styles.title} numberOfLines={1}>{entryLabel(entry)}</Text>
          {entry.createdAt ? (
            <Text style={styles.time}>{formatTime(entry.createdAt)}</Text>
          ) : null}
        </View>
        <Text style={styles.summary}>{formatStatValue(entry.caloriesKcal)} kcal</Text>
        <View style={styles.macros}>
          {macros.map((macro) => (
            <View key={macro.key} style={styles.macro}>
              <Text style={styles.macroValue}>{formatStatValue(macro.value)}g</Text>
              <Text style={styles.macroLabel}>{macro.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {showChevron ? (
        <ChevronRight color="#c7c7cc" size={16} strokeWidth={2} style={styles.chevron} />
      ) : null}
    </View>
  );
}

export default function HomeRecentMealUploads({ entries, readOnly = false }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="list" accessibilityLabel="Registros recentes">
      {entries.map((entry, index) => {
        const bordered = index < entries.length - 1;

        if (readOnly) {
          return (
            <View key={entry.id} style={bordered ? styles.rowWrapBorder : styles.rowWrap}>
              <MealRow entry={entry} showChevron={false} />
            </View>
          );
        }

        return (
          <Link key={entry.id} href="/diario" asChild>
            <Pressable
              style={bordered ? styles.rowWrapBorder : styles.rowWrap}
              accessibilityRole="button"
              accessibilityLabel={`${entryLabel(entry)}, ${formatStatValue(entry.caloriesKcal)} kcal`}
            >
              <MealRow entry={entry} showChevron />
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: radii.control,
    backgroundColor: '#fff',
  },
  rowWrap: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rowWrapBorder: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60, 60, 67, 0.1)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#e9e9ed',
    flexShrink: 0,
  },
  imagePlaceholder: { backgroundColor: '#e9e9ed' },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  time: {
    flexShrink: 0,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: '#8e8e93',
    fontVariant: ['tabular-nums'],
  },
  summary: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 16,
    color: colors.primaryDark,
    fontVariant: ['tabular-nums'],
  },
  macros: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginTop: 2,
  },
  macro: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    flexShrink: 0,
  },
  macroValue: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 15,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  macroLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 14,
    color: '#8e8e93',
  },
  chevron: {
    flexShrink: 0,
    marginLeft: 2,
  },
});
