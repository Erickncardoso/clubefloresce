import 'react-native-gesture-handler';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { usePatientRouteGuard } from '@/hooks/usePatientRouteGuard';
import { useSimulatorMockupTheme } from '@/hooks/useSimulatorMockupTheme';
import PatientMealPlanGate, { useShowMealPlanGate } from '@/components/dieta/PatientMealPlanGate';
import PatientTabBar from '@/components/PatientTabBar';
import { shouldShowPatientTabBar } from '@/lib/tab-bar';
import { iosHiddenHeaderOptions } from '@/lib/ios-navigation';
import { AppToastProvider } from '@/providers/AppToastProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { PatientGoalsProvider } from '@/providers/PatientGoalsProvider';
import { PatientMealPlanProvider } from '@/providers/PatientMealPlanProvider';
import NotificationBootstrap from '@/notifications/NotificationBootstrap';
import IncomingVideoCallBootstrap from '@/notifications/IncomingVideoCallBootstrap';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import OtaUpdatePrompt from '@/components/OtaUpdatePrompt';
import { patientNavigationTheme } from '@/lib/patient-navigation-theme';
import { colors } from '@/theme/tokens';

function AppNavigationShell() {
  usePatientRouteGuard();
  useSimulatorMockupTheme();
  const pathname = usePathname();
  const showMealPlanGate = useShowMealPlanGate();
  const showTabBar = shouldShowPatientTabBar(pathname) && !showMealPlanGate;

  return (
    <View style={styles.navShell}>
      <View style={styles.navContent}>
        <IncomingVideoCallBootstrap />
        <PatientMealPlanGate />
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
          <Stack.Screen name="chamada/index" />
          <Stack.Screen name="legal/privacidade" />
          <Stack.Screen name="legal/termos" />
          <Stack.Screen name="legal/fontes" />
          <Stack.Screen name="menu" />
          <Stack.Screen name="assinatura/index" />
          <Stack.Screen name="perfil/configuracoes" />
          <Stack.Screen name="perfil/configuracoes/preferencias" />
          <Stack.Screen name="perfil/notificacoes" />
          <Stack.Screen name="perfil/lembretes" />
          <Stack.Screen name="register" />
          <Stack.Screen name="esqueci-senha" />
        </Stack>
      </View>
      {showTabBar ? <PatientTabBar /> : null}
    </View>
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
    <ThemeProvider value={patientNavigationTheme}>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <AppErrorBoundary>
            <AuthProvider>
              <AppToastProvider>
                <PatientGoalsProvider>
                  <PatientMealPlanProvider>
                    <NotificationBootstrap />
                    <StatusBar style="dark" backgroundColor={colors.bg} />
                    <OtaUpdatePrompt />
                    <AppNavigationShell />
                  </PatientMealPlanProvider>
                </PatientGoalsProvider>
              </AppToastProvider>
            </AuthProvider>
          </AppErrorBoundary>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  navShell: { flex: 1, backgroundColor: 'transparent', overflow: 'visible' },
  navContent: { flex: 1, backgroundColor: colors.bg },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
