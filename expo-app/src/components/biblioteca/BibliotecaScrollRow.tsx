import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import type { ContentTile } from '@/lib/course-tile';
import { patientAssets } from '@/lib/patient-assets';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = {
  title: string;
  items: ContentTile[];
  seeAllHref?: string;
  onSelect: (item: ContentTile) => void;
};

export default function BibliotecaScrollRow({ title, items, seeAllHref, onSelect }: Props) {
  const router = useRouter();
  if (!items.length) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        {seeAllHref ? (
          <Pressable style={styles.seeAll} onPress={() => router.push(seeAllHref as never)}>
            <Text style={styles.seeAllText}>Ver tudo</Text>
            <ChevronRight size={14} color={colors.primaryDark} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((item) => (
          <Pressable key={`${item.kind}-${item.id}`} style={styles.tile} onPress={() => onSelect(item)}>
            <Image
              source={item.cover ? { uri: item.cover } : patientAssets.courseCover}
              style={styles.cover}
              resizeMode="cover"
            />
            <Text style={styles.badge}>{item.label}</Text>
            <Text style={styles.tileTitle} numberOfLines={2}>{item.value}</Text>
            <Text style={styles.tileMeta} numberOfLines={1}>{item.meta}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing[5] },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primaryDark },
  row: { gap: spacing[3], paddingRight: spacing[4] },
  tile: {
    width: 156,
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cover: { width: '100%', height: 120, backgroundColor: colors.primarySoft },
  badge: {
    marginTop: spacing[2],
    marginHorizontal: spacing[3],
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: colors.primaryDark,
    textTransform: 'uppercase',
  },
  tileTitle: {
    marginHorizontal: spacing[3],
    marginTop: 4,
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
    minHeight: 34,
  },
  tileMeta: {
    marginHorizontal: spacing[3],
    marginTop: 2,
    marginBottom: spacing[3],
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
});
