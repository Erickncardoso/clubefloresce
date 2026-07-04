import { Platform, DynamicColorIOS } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

const iosTint =
  Platform.OS === 'ios'
    ? DynamicColorIOS({ light: '#007AFF', dark: '#0A84FF' })
    : '#8B967C';

/** Sem header — tabs e telas com UI própria. */
export const iosHiddenHeaderOptions: NativeStackNavigationOptions = {
  headerShown: false,
};

/** Header compacto iOS (sem Large Title). */
export const iosCompactStackOptions: NativeStackNavigationOptions = Platform.select({
  ios: {
    headerShown: true,
    headerLargeTitle: false,
    headerBackTitle: '',
    headerBackButtonDisplayMode: 'minimal',
    headerShadowVisible: false,
    headerBlurEffect: 'systemChromeMaterial',
    headerTintColor: iosTint,
    headerTitleStyle: { fontSize: 17, fontWeight: '600' },
    contentStyle: { backgroundColor: '#F2F2F7' },
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
  },
  default: {
    headerShown: false,
  },
}) as NativeStackNavigationOptions;

/** @deprecated Use iosCompactStackOptions ou iosHiddenHeaderOptions */
export const iosNativeStackScreenOptions = iosCompactStackOptions;
