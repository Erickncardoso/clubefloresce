import { Tabs } from 'expo-router';

/**
 * Tab bar customizada (`PatientTabBar`) no root — espelha `cliente/app.vue`.
 * NativeTabs quebra no web/simulador (menu aparece no topo).
 */
const hiddenNativeTabBarStyle = {
  position: 'absolute' as const,
  left: 0,
  right: 0,
  bottom: 0,
  height: 0,
  maxHeight: 0,
  opacity: 0,
  overflow: 'hidden' as const,
  borderTopWidth: 0,
  borderTopColor: 'transparent',
  elevation: 0,
  shadowOpacity: 0,
  shadowRadius: 0,
  shadowOffset: { width: 0, height: 0 },
  backgroundColor: 'transparent',
};

export default function PatientTabsLayout() {
  return (
    <Tabs
      tabBar={() => null}
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: hiddenNativeTabBarStyle,
        tabBarBackground: () => null,
        safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
        sceneStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Tabs.Screen name="inicio" options={{ title: 'Início' }} />
      <Tabs.Screen name="evolucao" options={{ title: 'Evolução' }} />
      <Tabs.Screen name="bella" options={{ title: 'Bella' }} />
      <Tabs.Screen name="conteudo" options={{ title: 'Biblioteca' }} />
      <Tabs.Screen name="diario" options={{ title: 'Diário' }} />
      <Tabs.Screen name="comunidade" options={{ href: null, title: 'Comunidade' }} />
    </Tabs>
  );
}
