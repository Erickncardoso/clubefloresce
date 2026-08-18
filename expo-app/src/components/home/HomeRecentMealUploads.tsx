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

export default function HomeRecentMealUploads({ entries, readOnly = false }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="list" accessibilityLabel="Registros recentes">
      {entries.map((entry, index) => {
        const rowContent = (
          <>
            {entry.imageUrl ? (
              <Image
                source={{ uri: entry.imageUrl }}
                style={styles.image}
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
                <Text style={styles.macro} numberOfLines={1}>
                  Proteína {formatStatValue(entry.proteinG)}g
                </Text>
                <Text style={styles.macro} numberOfLines={1}>
                  Carboidrato {formatStatValue(entry.carbsG)}g
                </Text>
                <Text style={styles.macro} numberOfLines={1}>
                  Gordura {formatStatValue(entry.fatG)}g
                </Text>
              </View>
            </View>

            {!readOnly ? <ChevronRight color="#aeaeb2" size={14} strokeWidth={2} /> : null}
          </>
        );

        if (readOnly) {
          return (
            <View
              key={entry.id}
              style={[styles.row, index < entries.length - 1 && styles.rowBorder]}
            >
              {rowContent}
            </View>
          );
        }

        return (
          <Link key={entry.id} href="/diario" asChild>
            <Pressable style={[styles.row, index < entries.length - 1 && styles.rowBorder]}>
              {rowContent}
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
    borderRadius: radii.surface,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    minHeight: 96,
    padding: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60, 60, 67, 0.1)',
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#e9e9ed',
  },
  imagePlaceholder: { backgroundColor: '#e9e9ed' },
  body: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  title: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  time: { fontFamily: fonts.regular, fontSize: 10, color: '#8e8e93' },
  summary: { marginTop: 3, fontFamily: fonts.medium, fontSize: 11, color: colors.primaryDark },
  macros: { flexDirection: 'row', gap: 8, marginTop: 7, flexWrap: 'nowrap', overflow: 'hidden' },
  macro: { fontFamily: fonts.regular, fontSize: 10, color: '#6e6e73' },
});
