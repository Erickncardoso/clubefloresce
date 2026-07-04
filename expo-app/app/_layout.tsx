import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { usePatientRouteGuard } from '@/hooks/usePatientRouteGuard';
import { iosHiddenHeaderOptions } from '@/lib/ios-navigation';
import { AuthProvider } from '@/providers/AuthProvider';
import { colors } from '@/theme/tokens';

function AppNavigationShell() {
  usePatientRouteGuard();

  return (
    <Stack screenOptions={iosHiddenHeaderOptions}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="cursos/[id]" />
      <Stack.Screen name="modulos/[id]" />
      <Stack.Screen name="ebooks" />
      <Stack.Screen name="ebook-viewer" />
      <Stack.Screen name="cursos/index" />
      <Stack.Screen name="dieta/index" />
      <Stack.Screen name="perfil/index" />
      <Stack.Screen name="check-in/index" />
      <Stack.Screen name="bella/chat/[topic]" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <AppNavigationShell />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
