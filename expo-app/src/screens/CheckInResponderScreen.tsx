import { useEffect } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CheckInResponderScreen() {
  const { template } = useLocalSearchParams<{ template?: string }>();

  if (typeof template === 'string' && template.trim()) {
    return <Redirect href={{ pathname: '/check-in', params: { template: template.trim() } }} />;
  }

  return <Redirect href="/check-in" />;
}
