import { Stack } from 'expo-router';
import { iosHiddenHeaderOptions } from '@/lib/ios-navigation';

export default function InicioTabLayout() {
  return (
    <Stack screenOptions={iosHiddenHeaderOptions}>
      <Stack.Screen name="index" options={iosHiddenHeaderOptions} />
    </Stack>
  );
}
