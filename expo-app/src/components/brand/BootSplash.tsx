import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import FlorescerDrawLogo, { FLORESCER_DRAW_MS } from '@/components/brand/FlorescerDrawLogo';

type Props = {
  appReady: boolean;
  onFinish: () => void;
};

export default function BootSplash({ appReady, onFinish }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [drawDone, setDrawDone] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setDrawDone(true), FLORESCER_DRAW_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!appReady || !drawDone || finished.current) return;
    finished.current = true;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished: ok }) => {
      if (ok) onFinish();
    });
  }, [appReady, drawDone, onFinish, opacity]);

  return (
    <Animated.View style={[styles.screen, { opacity }]} pointerEvents="none">
      <FlorescerDrawLogo size={132} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9f6',
  },
});
