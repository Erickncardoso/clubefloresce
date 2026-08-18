import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { MessageCircle, User, UtensilsCrossed } from 'lucide-react-native';
import DiarioLikeHeart from '@/components/diario/DiarioLikeHeart';
import { resolveMediaUrl } from '@/lib/media-url';
import {
  diaryMealLabel,
  formatDiaryRelative,
  shortDiaryName,
  type DiaryFeedEntry,
} from '@/lib/patient-diary-feed';
import { fonts } from '@/theme/tokens';

const ASPECTS = [3 / 4, 4 / 5, 1, 5 / 6, 2 / 3] as const;
const CARD_RADIUS = 14;

type Props = {
  entry: DiaryFeedEntry;
  index: number;
  authorName?: string | null;
  authorAvatar?: string | null;
  onOpenPhoto: (url: string) => void;
  onOpenLike: (entry: DiaryFeedEntry) => void;
  onOpenComments: (entry: DiaryFeedEntry) => void;
  highlightLike?: boolean;
};

export default function DiarioFeedCard({
  entry,
  index,
  authorName,
  authorAvatar,
  onOpenPhoto,
  onOpenLike,
  onOpenComments,
  highlightLike = false,
}: Props) {
  const photo = resolveMediaUrl(entry.imageUrl);
  const meal = diaryMealLabel(entry);
  const liked = Boolean(entry.likedByNutri || entry.likesCount > 0);
  const avatar = resolveMediaUrl(authorAvatar);
  const name = shortDiaryName(authorName);

  return (
    <View style={styles.card}>
      <View style={[styles.photoShell, { aspectRatio: ASPECTS[index % ASPECTS.length] }]}>
        <Pressable
          style={styles.photoHit}
          onPress={() => photo && onOpenPhoto(photo)}
          accessibilityLabel={`Foto de ${meal}`}
        >
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photo, styles.photoFallback]} />
          )}
        </Pressable>

        <View style={styles.namePill} pointerEvents="none">
          <BlurView intensity={18} tint="dark" style={styles.nameBlur}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <User size={12} color="#fff" strokeWidth={1.8} />
              </View>
            )}
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
          </BlurView>
        </View>

        <View style={styles.bottomBar} pointerEvents="box-none">
          <BlurView intensity={18} tint="dark" style={styles.bottomBlur}>
            <View style={styles.meta}>
              <View style={styles.mealRow}>
                <UtensilsCrossed size={12} color="#fff" strokeWidth={2} />
                <Text style={styles.meal} numberOfLines={1}>{meal}</Text>
              </View>
              <Text style={styles.when}>{formatDiaryRelative(entry.createdAt)}</Text>
            </View>

            <View style={styles.actions}>
              <DiarioLikeHeart
                liked={liked}
                highlight={highlightLike}
                onPress={() => onOpenLike(entry)}
              />
              <Pressable
                style={styles.actionBtn}
                onPress={() => onOpenComments(entry)}
                accessibilityLabel={
                  entry.commentsCount
                    ? `${entry.commentsCount} comentários`
                    : 'Comentários'
                }
              >
                <MessageCircle size={20} color="#fff" strokeWidth={1.8} />
                {entry.commentsCount > 0 ? (
                  <Text style={styles.count}>{entry.commentsCount}</Text>
                ) : null}
              </Pressable>
            </View>
          </BlurView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
  },
  photoShell: {
    width: '100%',
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#eef0eb',
  },
  photoHit: {
    ...StyleSheet.absoluteFillObject,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoFallback: { backgroundColor: '#eef0eb' },
  namePill: {
    position: 'absolute',
    top: 9,
    left: 9,
    zIndex: 2,
    maxWidth: '86%',
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(10, 12, 11, 0.42)',
  },
  nameBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 27,
    paddingVertical: 3,
    paddingLeft: 3,
    paddingRight: 8,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#c8ccc6',
  },
  avatarFallback: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flexShrink: 1,
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#fff',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 12, 11, 0.42)',
  },
  bottomBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingLeft: 11,
    paddingRight: 8,
    paddingVertical: 8,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  meal: {
    flexShrink: 1,
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: '#fff',
  },
  when: {
    marginTop: 1,
    fontFamily: fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.88)',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    padding: 4,
  },
  count: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#fff',
  },
});
