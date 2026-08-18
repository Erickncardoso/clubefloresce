import { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Heart, User } from 'lucide-react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { resolveMediaUrl } from '@/lib/media-url';
import { shortDiaryName, type DiaryFeedAuthor } from '@/lib/patient-diary-feed';
import { fonts } from '@/theme/tokens';

type Props = {
  likes: DiaryFeedAuthor[];
  likeCount?: number;
  active: boolean;
};

function likeTitle(count: number) {
  if (!count) return 'Ainda sem curtida';
  if (count === 1) return '1 curtida';
  return `${count} curtidas`;
}

export default function DiarioLikePanel({ likes, likeCount = 0, active }: Props) {
  const count = Math.max(likes.length, likeCount);
  const hasLike = count > 0;
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const ring = useSharedValue(0);

  useEffect(() => {
    if (!active || !hasLike || reduceMotion) {
      scale.value = 1;
      ring.value = 0;
      return;
    }
    scale.value = 1;
    ring.value = 0;
    scale.value = withSequence(
      withTiming(1.18, { duration: 180, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 10, stiffness: 260 }),
    );
    ring.value = withDelay(30, withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }));
  }, [active, hasLike, reduceMotion, ring, scale]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 0.14, 1], [0, 0.85, 0]),
    transform: [{ scale: interpolate(ring.value, [0, 1], [0.9, 1.7]) }],
  }));

  return (
    <View style={styles.body}>
      <View style={styles.iconWrap}>
        {hasLike ? <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} /> : null}
        <Animated.View
          style={[styles.icon, hasLike ? styles.iconOn : styles.iconOff, heartStyle]}
        >
          <Heart
            size={28}
            color="#fff"
            fill={hasLike ? '#fff' : 'none'}
            strokeWidth={2}
          />
        </Animated.View>
      </View>
      <Text style={styles.title}>{likeTitle(count)}</Text>
      <Text style={styles.copy}>
        {hasLike
          ? 'Sua nutri viu este prato e deixou um coração.'
          : 'Quando ela curtir, o coração fica rosa na foto.'}
      </Text>
      {hasLike ? (
        <View style={styles.people}>
          {likes.map((person) => {
            const avatar = resolveMediaUrl(person.avatar);
            return (
              <View key={person.id} style={styles.chip}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <User size={11} color="#fff" strokeWidth={1.8} />
                  </View>
                )}
                <Text style={styles.chipName} numberOfLines={1}>
                  {shortDiaryName(person.name)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 10,
    paddingHorizontal: 8,
  },
  iconWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ring: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#ff6b8a',
  },
  icon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOn: { backgroundColor: '#ff6b8a' },
  iconOff: { backgroundColor: 'rgba(255,255,255,0.12)' },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
  },
  copy: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },
  people: {
    marginTop: 16,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 36,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  chipName: { fontFamily: fonts.semibold, fontSize: 13, color: '#fff', maxWidth: 160 },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#3a3f3c' },
  avatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
