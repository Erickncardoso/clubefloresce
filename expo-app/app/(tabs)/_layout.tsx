import { Platform, DynamicColorIOS } from 'react-native';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { colors } from '@/theme/tokens';

const tint =
  Platform.OS === 'ios'
    ? DynamicColorIOS({ light: '#007AFF', dark: '#0A84FF' })
    : colors.primary;

/**
 * Tab bar 100% nativa do iOS (Liquid Glass no iOS 26+).
 * Não usar PatientTabBar JS — o sistema renderiza UITabBarController.
 */
export default function PatientNativeTabsLayout() {
  return (
    <NativeTabs
      tintColor={tint}
      blurEffect={Platform.OS === 'ios' ? 'systemChromeMaterial' : undefined}
      minimizeBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
      labelVisibilityMode="labeled"
    >
      <NativeTabs.Trigger name="inicio">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Início</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="evolucao">
        <Icon sf={{ default: 'chart.line.uptrend.xyaxis', selected: 'chart.line.uptrend.xyaxis' }} />
        <Label>Evolução</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="bella">
        <Icon sf={{ default: 'plus.circle', selected: 'plus.circle.fill' }} />
        <Label>Bella</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="conteudo">
        <Icon sf={{ default: 'book', selected: 'book.fill' }} />
        <Label>Biblioteca</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="comunidade">
        <Icon sf={{ default: 'person.3', selected: 'person.3.fill' }} />
        <Label>Comunidade</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
