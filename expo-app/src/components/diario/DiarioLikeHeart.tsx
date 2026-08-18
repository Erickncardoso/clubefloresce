import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Heart } from 'lucide-react-native';
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

type Props = {
  liked: boolean;
  highlight?: boolean;
  onPress: () => void;
};

export default function DiarioLikeHeart({ liked, highlight = false, onPress }: Props) {
  const played = useRef(false);
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const ring = useSharedValue(0);

  useEffect(() => {
    if (!highlight) {
      played.current = false;
      return;
    }
    if (!liked || played.current || reduceMotion) return;
    played.current = true;
    scale.value = 1;
    ring.value = 0;
    scale.value = withSequence(
      withTiming(1.28, { duration: 170, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 9, stiffness: 280 }),
      withTiming(1.14, { duration: 140, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 11, stiffness: 300 }),
    );
    ring.value = withDelay(30, withTiming(1, { duration: 620, easing: Easing.out(Easing.quad) }));
  }, [highlight, liked, reduceMotion, ring, scale]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 0.16, 1], [0, 1, 0]),
    transform: [{ scale: interpolate(ring.value, [0, 1], [0.7, 1.85]) }],
  }));

  return (
    <Pressable
      style={styles.hit}
      onPress={onPress}
      accessibilityLabel={liked ? 'Sua nutri curtiu' : 'Curtida'}
    >
      {liked ? (
        <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />
      ) : null}
      <Animated.View style={heartStyle}>
        <Heart
          size={20}
          color={liked ? '#ff6b8a' : '#fff'}
          fill={liked ? '#ff6b8a' : 'none'}
          strokeWidth={1.8}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ff8aa3',
  },
});
