import { Stack } from 'expo-router';
import { iosHiddenHeaderOptions } from '@/lib/ios-navigation';

export default function BellaTabLayout() {
  return (
    <Stack screenOptions={iosHiddenHeaderOptions}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
