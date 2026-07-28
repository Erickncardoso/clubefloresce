import { useCallback, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BookOpen } from 'lucide-react-native';
import type { ContentTile } from '@/lib/course-tile';
import { colors, fonts, spacing } from '@/theme/tokens';

const TILE_WIDTH = 156;
const TILE_GAP = 12;
const TILE_RADIUS = Math.min(48, TILE_WIDTH * 0.42);

const TONE_EMPTY_BG: Record<string, string> = {
  pink: '#f5eef2',
  orange: '#fff3e6',
  green: colors.primarySoft,
  purple: '#f0ebf8',
  blue: '#e8f2fa',
};

type Props = {
  items: ContentTile[];
  onSelect: (item: ContentTile) => void;
  inset?: number;
  showDots?: boolean;
};

export default function CfTileCarousel({
  items,
  onSelect,
  inset = spacing[4],
  showDots = true,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedCovers, setFailedCovers] = useState<Record<string, boolean>>({});

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.max(0, Math.round(x / (TILE_WIDTH + TILE_GAP)));
    setActiveIndex(index);
  }, []);

  if (!items.length) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={TILE_WIDTH + TILE_GAP}
        decelerationRate="fast"
        contentContainerStyle={[styles.track, { paddingHorizontal: inset }]}
        style={{ marginHorizontal: -inset }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {items.map((item) => {
          const coverFailed = Boolean(failedCovers[item.id]);
          const coverUri = item.cover && !coverFailed ? item.cover : null;

          return (
            <Pressable
              key={`${item.kind}-${item.id}`}
              style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
              onPress={() => onSelect(item)}
            >
              <View style={styles.media}>
                {coverUri ? (
                  <Image
                    source={{ uri: coverUri }}
                    style={styles.cover}
                    resizeMode="cover"
                    onError={() => setFailedCovers((prev) => ({ ...prev, [item.id]: true }))}
                  />
                ) : (
                  <View style={[styles.coverEmpty, { backgroundColor: TONE_EMPTY_BG[item.tone] || TONE_EMPTY_BG.blue }]}>
                    <BookOpen color={colors.primaryDark} size={28} style={{ opacity: 0.75 }} />
                  </View>
                )}
              </View>
              <View style={styles.body}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.value} numberOfLines={2}>{item.value}</Text>
                {item.meta ? <Text style={styles.meta} numberOfLines={1}>{item.meta}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {showDots && items.length > 1 ? (
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {items.map((item, index) => (
            <View
              key={`dot-${item.id}`}
              style={[styles.dot, activeIndex === index && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing[2] },
  track: { gap: TILE_GAP, paddingBottom: 4 },
  tile: { width: TILE_WIDTH },
  tilePressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  media: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: TILE_RADIUS,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
  },
  cover: { width: '100%', height: '100%' },
  coverEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingTop: 9, paddingHorizontal: 2, gap: 2 },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 14,
  },
  value: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    minHeight: 36,
  },
  meta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 15,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.track,
  },
  dotActive: {
    backgroundColor: colors.primary,
    transform: [{ scale: 1.15 }],
  },
});
