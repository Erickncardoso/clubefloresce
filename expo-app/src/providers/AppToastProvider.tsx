import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '@/theme/tokens';
import { toastError as buildToastError, toastSuccess as buildToastSuccess } from '@/lib/app-toast';

export type AppToastType = 'success' | 'error' | 'call';

export type AppToastPayload = {
  type?: AppToastType;
  title?: string;
  message?: string;
  detail?: string;
  duration?: number;
};

type ToastState = AppToastPayload & {
  id: number;
};

type AppToastContextValue = {
  showToast: (payload?: AppToastPayload) => void;
  hideToast: () => void;
  toastSuccess: (title: string, message?: string) => void;
  toastError: (title: string, message?: string) => void;
};

const AppToastContext = createContext<AppToastContextValue | null>(null);

function AppToastBanner({
  toast,
  onHide,
}: {
  toast: ToastState | null;
  onHide: () => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;

    translateY.setValue(-120);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 240,
        mass: 0.75,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [toast, opacity, translateY]);

  if (!toast) return null;

  const type = toast.type || 'success';
  const primaryText = toast.title || toast.message || '';
  const secondaryParts: string[] = [];
  if (toast.title && toast.message && toast.title !== toast.message) {
    secondaryParts.push(toast.message);
  }
  if (toast.detail) secondaryParts.push(toast.detail);
  const secondaryText = secondaryParts.join(' · ');

  const isError = type === 'error';
  const isCall = type === 'call';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.host,
        isError ? styles.hostError : styles.hostSuccess,
        isCall && styles.hostCall,
        {
          paddingTop: Math.max(insets.top, 8),
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Pressable
        style={styles.inner}
        accessibilityRole="alert"
        onPress={onHide}
      >
        <View style={styles.row}>
          {isCall ? (
            <View style={styles.pulse} />
          ) : isError ? (
            <View style={styles.iconBadgeError}>
              <X color="#fff" size={14} strokeWidth={2.25} />
            </View>
          ) : (
            <View style={styles.iconBadgeSuccess}>
              <Check color="#0f1a14" size={14} strokeWidth={2.5} />
            </View>
          )}

          <View style={[styles.copy, !secondaryText && styles.copyCentered]}>
            {primaryText ? (
              <Text
                style={[
                  styles.title,
                  isError ? styles.titleError : styles.titleSuccess,
                ]}
                numberOfLines={2}
              >
                {primaryText}
              </Text>
            ) : null}
            {secondaryText ? (
              <Text
                style={[
                  styles.subtitle,
                  isError ? styles.subtitleError : styles.subtitleSuccess,
                ]}
                numberOfLines={2}
              >
                {secondaryText}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((payload: AppToastPayload = {}) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    const duration = payload.duration ?? 4500;
    const nextToast: ToastState = {
      id: Date.now(),
      type: payload.type || 'success',
      title: payload.title || '',
      message: payload.message || '',
      detail: payload.detail || '',
      duration,
    };

    setToast(nextToast);

    if (duration > 0) {
      hideTimerRef.current = setTimeout(() => {
        setToast(null);
        hideTimerRef.current = null;
      }, duration);
    }
  }, []);

  const toastSuccess = useCallback((title: string, message?: string) => {
    showToast(buildToastSuccess(title, message));
  }, [showToast]);

  const toastError = useCallback((title: string, message?: string) => {
    showToast(buildToastError(title, message));
  }, [showToast]);

  useEffect(() => () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const value = useMemo(
    () => ({ showToast, hideToast, toastSuccess, toastError }),
    [hideToast, showToast, toastError, toastSuccess],
  );

  return (
    <AppToastContext.Provider value={value}>
      {children}
      <Modal
        visible={Boolean(toast)}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={hideToast}
      >
        <View style={styles.modalRoot} pointerEvents="box-none">
          <AppToastBanner toast={toast} onHide={hideToast} />
        </View>
      </Modal>
    </AppToastContext.Provider>
  );
}

export function useAppToast() {
  const ctx = useContext(AppToastContext);
  if (!ctx) {
    throw new Error('useAppToast must be used within AppToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 99999,
    elevation: 99999,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  hostSuccess: {
    backgroundColor: '#5cdb95',
  },
  hostCall: {
    backgroundColor: '#5cdb95',
  },
  hostError: {
    backgroundColor: '#ef4444',
  },
  inner: {
    width: '100%',
    minHeight: 38,
    paddingHorizontal: 16,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  iconBadgeSuccess: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(15, 26, 20, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconBadgeError: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pulse: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#0f1a14',
    flexShrink: 0,
  },
  copy: {
    flexShrink: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  copyCentered: {
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.13,
  },
  titleSuccess: {
    color: '#0f1a14',
  },
  titleError: {
    color: '#fff',
  },
  subtitle: {
    marginTop: 1,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  subtitleSuccess: {
    color: 'rgba(15, 26, 20, 0.78)',
  },
  subtitleError: {
    color: 'rgba(255, 255, 255, 0.92)',
  },
});
