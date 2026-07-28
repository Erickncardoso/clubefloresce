import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function triggerPickerHaptic() {
  if (Platform.OS === 'web') return;
  void Haptics.selectionAsync().catch(() => {});
}

export function tickPickerIndex(lastIndexRef: { current: number }, index: number) {
  if (lastIndexRef.current === index) return;
  lastIndexRef.current = index;
  triggerPickerHaptic();
}
