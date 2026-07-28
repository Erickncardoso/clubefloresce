import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import CfTileCarousel from '@/components/shared/CfTileCarousel';
import type { ContentTile } from '@/lib/course-tile';
import { colors, fonts, spacing } from '@/theme/tokens';

type Props = {
  title: string;
  items: ContentTile[];
  seeAllHref?: string;
  onSelect: (item: ContentTile) => void;
};

/** Espelha `frontend/components/biblioteca/BibliotecaScrollRow.vue`. */
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
      <CfTileCarousel items={items} onSelect={onSelect} />
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
    gap: spacing[2],
  },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, letterSpacing: -0.4 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32, paddingHorizontal: 2 },
  seeAllText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primaryDark },
});
