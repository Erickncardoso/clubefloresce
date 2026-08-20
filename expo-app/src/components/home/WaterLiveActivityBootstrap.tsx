import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

import {
  isLiveActivityDeepLink,
  requestOpenWaterSheetFromIsland,
  syncWaterLiveActivityFromStore,
} from '@/lib/water-live-activity';
import { readGoalsStore, STORAGE_KEY } from '@/lib/patient-goals-core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isLiveActivitySupported } from '../../../modules/live-activity';

async function readGoalsForSync() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return readGoalsStore(raw);
  } catch {
    return readGoalsStore(null);
  }
}

function handleIslandDeepLink(url: string | null, router: ReturnType<typeof useRouter>) {
  if (!isLiveActivityDeepLink(url)) return;
  requestOpenWaterSheetFromIsland();
  router.push('/inicio' as never);
}

/** Re-sync da ilha + deep link ao tocar na Live Activity (OTA-safe). */
export default function WaterLiveActivityBootstrap() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'ios' || !isLiveActivitySupported()) return;

    void Linking.getInitialURL().then((url) => {
      handleIslandDeepLink(url, router);
    });

    const linkSub = Linking.addEventListener('url', ({ url }) => {
      handleIslandDeepLink(url, router);
    });

    const appSub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void readGoalsForSync().then((store) => {
        void syncWaterLiveActivityFromStore(store, { force: true });
      });
    });

    const poll = setInterval(() => {
      if (AppState.currentState !== 'active') return;
      void readGoalsForSync().then((store) => {
        void syncWaterLiveActivityFromStore(store);
      });
    }, 3 * 60 * 1000);

    return () => {
      linkSub.remove();
      appSub.remove();
      clearInterval(poll);
    };
  }, [router]);

  return null;
}
