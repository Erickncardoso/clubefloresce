import { useEffect } from 'react';
import { Platform } from 'react-native';
import { usePathname } from 'expo-router';

type MockupTheme = {
  background: string;
  isDark: boolean;
};

const DEFAULT_THEME: MockupTheme = {
  background: '#ffffff',
  isDark: false,
};

/** Status bar do mockup iPhone — espelha `PATIENT_APP_THEME_COLOR` (#fff) do PWA. */
function themeForPath(pathname: string): MockupTheme {
  const path = pathname || '/';

  if (path.startsWith('/chamada')) {
    return { background: '#000000', isDark: true };
  }

  return DEFAULT_THEME;
}

/** Sincroniza a status bar do `simulator.html` quando o app roda em iframe (Expo Web). */
export function useSimulatorMockupTheme() {
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined' || window.parent === window) return;

    const theme = themeForPath(pathname);
    window.parent.postMessage(
      { type: 'mockup-theme', background: theme.background, isDark: theme.isDark },
      '*',
    );
  }, [pathname]);
}
