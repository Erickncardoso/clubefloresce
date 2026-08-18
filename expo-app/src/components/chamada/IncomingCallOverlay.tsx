import { useEffect, useRef, useState } from 'react';
import { Image, Modal, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { PhoneOff, Video } from 'lucide-react-native';
import IncomingCallSwipeKnob from '@/components/chamada/IncomingCallSwipeKnob';
import { chamadaInitials } from '@/components/chamada/ChamadaAvatar';
import { resolveMediaUrl } from '@/lib/media-url';
import { fonts, spacing } from '@/theme/tokens';

type Props = {
  visible: boolean;
  nutriName?: string;
  nutriAvatar?: string | null;
  onAnswer: () => void;
  onDismiss: () => void;
};

export default function IncomingCallOverlay({
  visible,
  nutriName,
  nutriAvatar,
  onAnswer,
  onDismiss,
}: Props) {
  const insets = useSafeAreaInsets();
  const name = nutriName || 'Sua nutricionista';
  const photo = resolveMediaUrl(nutriAvatar);
  const [photoFailed, setPhotoFailed] = useState(false);
  const lockedRef = useRef(false);
  const pulse = useSharedValue(0);

  useEffect(() => {
    setPhotoFailed(false);
    lockedRef.current = false;
    if (!visible) {
      pulse.value = 0;
      return undefined;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    return undefined;
  }, [visible, photo, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.5, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.42]) }],
  }));

  const fire = (action: () => void, haptic: 'success' | 'error') => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    const style =
      haptic === 'success'
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error;
    void Haptics.notificationAsync(style).catch(() => {});
    action();
  };

  const showPhoto = Boolean(photo) && !photoFailed;

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="overFullScreen" transparent>
      <GestureHandlerRootView style={styles.flex}>
        <StatusBar style="light" />
        <View
          style={[
            styles.root,
            {
              paddingTop: Math.max(insets.top, 28),
              paddingBottom: Math.max(insets.bottom, 28),
            },
          ]}
        >
          {showPhoto ? (
            <Image
              source={{ uri: photo }}
              style={StyleSheet.absoluteFill}
              blurRadius={48}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.dim} />

          <View style={styles.identity}>
            <View style={styles.avatarWrap}>
              <Animated.View style={[styles.pulseRing, ringStyle]} />
              {showPhoto ? (
                <Image
                  source={{ uri: photo }}
                  style={styles.avatar}
                  onError={() => setPhotoFailed(true)}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.initials}>{chamadaInitials(name)}</Text>
                </View>
              )}
            </View>
            <Text style={styles.kicker}>Chamada de vídeo</Text>
            <Text style={styles.title}>{name}</Text>
            <Text style={styles.subtitle}>está te ligando</Text>
          </View>

          <View style={styles.actions}>
            <IncomingCallSwipeKnob
              direction="left"
              color="#e5484d"
              label="Recusar"
              hint="deslize ←"
              icon={<PhoneOff size={28} color="#fff" />}
              onActivate={() => fire(onDismiss, 'error')}
            />
            <IncomingCallSwipeKnob
              direction="right"
              color="#30a46c"
              label="Atender"
              hint="deslize →"
              icon={<Video size={28} color="#fff" />}
              onActivate={() => fire(onAnswer, 'success')}
            />
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const AVATAR = 132;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
    backgroundColor: '#111814',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[6],
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 16, 13, 0.72)',
  },
  identity: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },
  avatarWrap: {
    width: AVATAR + 28,
    height: AVATAR + 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
  },
  pulseRing: {
    position: 'absolute',
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
    willChange: 'transform',
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: '#2a3a30',
  },
  avatarFallback: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: '#2f6f4e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: fonts.extrabold,
    fontSize: 42,
    color: '#fff',
  },
  kicker: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.62)',
    marginBottom: spacing[2],
    letterSpacing: 0.4,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
    color: 'rgba(197, 208, 184, 0.92)',
    marginTop: 6,
  },
  actions: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[2],
    paddingBottom: spacing[4],
  },
});
