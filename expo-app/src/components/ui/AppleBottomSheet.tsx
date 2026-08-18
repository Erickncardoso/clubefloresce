import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  maxHeightRatio?: number;
  /** Padding horizontal do conteúdo (seções full-bleed usam margem negativa). */
  contentPadding?: number;
  /** false = não fecha no swipe/backdrop (ex.: escolha obrigatória). */
  dismissible?: boolean;
};

const DISMISS_DRAG = 110;
const DISMISS_VELOCITY = 900;
const SPRING = { damping: 32, stiffness: 340, mass: 0.85 };

type BottomSheetContextValue = {
  dismiss: () => void;
  /** Fecha o sheet e executa `after` quando a animação terminar. */
  dismissThen: (after?: () => void) => void;
  contentPadding: number;
};

const BottomSheetDismissContext = createContext<BottomSheetContextValue | null>(null);

export function useBottomSheetDismiss() {
  const ctx = useContext(BottomSheetDismissContext);
  if (!ctx) {
    throw new Error('useBottomSheetDismiss must be used within AppleBottomSheet');
  }
  return {
    dismiss: ctx.dismiss,
    dismissThen: ctx.dismissThen ?? ctx.dismiss,
    contentPadding: ctx.contentPadding,
  };
}

export default function AppleBottomSheet({
  visible,
  onClose,
  children,
  maxHeightRatio = 0.78,
  contentPadding = 16,
  dismissible = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = windowHeight * maxHeightRatio;

  const [mounted, setMounted] = useState(visible);
  const closingRef = useRef(false);
  const pendingAfterRef = useRef<(() => void) | null>(null);
  const translateY = useSharedValue(sheetHeight);
  const dragY = useSharedValue(0);
  const backdrop = useSharedValue(0);

  const finishClose = useCallback(() => {
    closingRef.current = false;
    setMounted(false);
    onClose();
  }, [onClose]);

  const finishCloseThen = useCallback(() => {
    finishClose();
    const after = pendingAfterRef.current;
    pendingAfterRef.current = null;
    if (after) {
      setTimeout(after, 0);
    }
  }, [finishClose]);

  const animateOut = useCallback((after?: () => void) => {
    pendingAfterRef.current = after ?? null;
    backdrop.value = withTiming(0, { duration: 180 });
    translateY.value = translateY.value + dragY.value;
    dragY.value = 0;
    translateY.value = withTiming(sheetHeight, { duration: 260 }, (finished) => {
      if (!finished) return;
      runOnJS(finishCloseThen)();
    });
  }, [backdrop, dragY, finishCloseThen, sheetHeight, translateY]);

  const closeSheet = useCallback(() => {
    if (closingRef.current || !mounted) return;
    closingRef.current = true;
    animateOut();
  }, [animateOut, mounted]);

  const dismissThen = useCallback((after?: () => void) => {
    if (closingRef.current || !mounted) {
      after?.();
      return;
    }
    closingRef.current = true;
    animateOut(after);
  }, [animateOut, mounted]);

  const dismiss = useCallback(() => {
    if (!dismissible) return;
    dismissThen();
  }, [dismissThen, dismissible]);

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      setMounted(true);
      dragY.value = 0;
      translateY.value = sheetHeight;
      requestAnimationFrame(() => {
        translateY.value = withSpring(0, SPRING);
        backdrop.value = withTiming(1, { duration: 220 });
      });
      return;
    }
    if (mounted && !closingRef.current) {
      closingRef.current = true;
      animateOut();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pan = Gesture.Pan()
    .enabled(dismissible)
    .activeOffsetY(8)
    .failOffsetX([-24, 24])
    .onUpdate((event) => {
      dragY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (dragY.value > DISMISS_DRAG || event.velocityY > DISMISS_VELOCITY) {
        translateY.value = translateY.value + dragY.value;
        dragY.value = 0;
        runOnJS(dismiss)();
        return;
      }
      dragY.value = withSpring(0, SPRING);
    });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value * interpolate(
      dragY.value,
      [0, sheetHeight * 0.45],
      [1, 0.15],
      Extrapolation.CLAMP,
    ),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.max(0, translateY.value + dragY.value) }],
  }));

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable style={styles.overlayTap} onPress={dismiss} accessibilityLabel="Fechar" />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            {
              maxHeight: sheetHeight,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              paddingHorizontal: contentPadding,
            },
          ]}
        >
          <GestureDetector gesture={pan}>
            <View style={styles.dragZone}>
              <View style={styles.handle} accessibilityElementsHidden />
            </View>
          </GestureDetector>
          <BottomSheetDismissContext.Provider
            value={{ dismiss: closeSheet, dismissThen, contentPadding }}
          >
            {children}
          </BottomSheetDismissContext.Provider>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 24, 28, 0.38)',
  },
  overlayTap: {
    flex: 1,
  },
  sheet: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 9,
    overflow: 'hidden',
  },
  dragZone: {
    paddingTop: 4,
    paddingBottom: 14,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#d2d2d7',
  },
});
