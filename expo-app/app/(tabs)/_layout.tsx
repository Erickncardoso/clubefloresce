import { Tabs } from 'expo-router';

/**
 * Tab bar customizada (`PatientTabBar`) no root — espelha `cliente/app.vue`.
 * NativeTabs quebra no web/simulador (menu aparece no topo).
 */
export default function PatientTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        sceneStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Tabs.Screen name="inicio" options={{ title: 'Início' }} />
      <Tabs.Screen name="evolucao" options={{ title: 'Evolução' }} />
      <Tabs.Screen name="bella" options={{ title: 'Bella' }} />
      <Tabs.Screen name="conteudo" options={{ title: 'Biblioteca' }} />
      <Tabs.Screen name="comunidade" options={{ title: 'Comunidade' }} />
    </Tabs>
  );
}
