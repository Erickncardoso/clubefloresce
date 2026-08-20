import { useCallback, useMemo } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { reportPatientTabBarScroll } from '@/lib/patient-tab-bar-scroll';

type ScrollProps = {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle: number;
};

/** Props para repassar em ScrollView / FlatList com tab bar auto-hide. */
export function usePatientScrollProps(): ScrollProps {
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    reportPatientTabBarScroll(event.nativeEvent.contentOffset.y);
  }, []);

  return useMemo(
    () => ({
      onScroll,
      scrollEventThrottle: 16,
    }),
    [onScroll],
  );
}
