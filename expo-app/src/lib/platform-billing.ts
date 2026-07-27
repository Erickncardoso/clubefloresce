import { Platform } from 'react-native';

/** Apple exige IAP para assinaturas digitais in-app; no iOS direcionamos para o site. */
export function requiresWebSubscription(): boolean {
  return Platform.OS === 'ios';
}
