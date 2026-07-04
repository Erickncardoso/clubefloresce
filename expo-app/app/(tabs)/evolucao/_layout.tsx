import { Stack } from 'expo-router';
import { iosHiddenHeaderOptions } from '@/lib/ios-navigation';

export default function EvolucaoTabLayout() {
  return (
    <Stack screenOptions={iosHiddenHeaderOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="nutricao" />
    </Stack>
  );
}
