import { Tabs } from 'expo-router';

/**
 * Tab bar customizada (`PatientTabBar`) no root — espelha `cliente/app.vue`.
 * NativeTabs quebra no web/simulador (menu aparece no topo).
 */
export default function PatientTabsLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          display: 'none',
          height: 0,
          overflow: 'hidden',
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: 'transparent',
        },
        safeAreaInsets: { top: 0, bottom: 0 },
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
