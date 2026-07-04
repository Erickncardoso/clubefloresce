import { Stack } from 'expo-router';
import { iosHiddenHeaderOptions } from '@/lib/ios-navigation';

export default function ComunidadeTabLayout() {
  return (
    <Stack screenOptions={iosHiddenHeaderOptions}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
