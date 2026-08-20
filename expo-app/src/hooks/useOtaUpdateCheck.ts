import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

const CHECK_COOLDOWN_MS = 5 * 60 * 1000;
/** Tempo para registrar push token antes de recarregar o OTA. */
const OTA_RELOAD_DELAY_MS = 18_000;

type UpdatesModule = typeof import('expo-updates');

async function loadUpdatesModule(): Promise<UpdatesModule | null> {
  try {
    return await import('expo-updates');
  } catch {
    return null;
  }
}

export function useOtaUpdateCheck() {
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const lastCheckAt = useRef(0);
  const busyRef = useRef(false);
  const updatesRef = useRef<UpdatesModule | null>(null);

  const applyIfReady = useCallback(async (delayMs = OTA_RELOAD_DELAY_MS) => {
    const Updates = updatesRef.current;
    if (!Updates?.isEnabled) return false;
    try {
      if (Updates.isUpdatePending) {
        setApplying(true);
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        await Updates.reloadAsync();
        return true;
      }
    } catch {
      setApplying(false);
    }
    return false;
  }, []);

  const checkForUpdate = useCallback(async (force = false) => {
    const Updates = updatesRef.current;
    if (!Updates?.isEnabled || busyRef.current) return;

    const now = Date.now();
    if (!force && now - lastCheckAt.current < CHECK_COOLDOWN_MS) {
      await applyIfReady();
      return;
    }

    busyRef.current = true;
    setError('');

    try {
      if (await applyIfReady()) return;

      const result = await Updates.checkForUpdateAsync();
      lastCheckAt.current = Date.now();
      if (!result.isAvailable) return;

      setApplying(true);
      const fetched = await Updates.fetchUpdateAsync();
      if (fetched.isNew || Updates.isUpdatePending) {
        await new Promise((resolve) => setTimeout(resolve, OTA_RELOAD_DELAY_MS));
        await Updates.reloadAsync();
        return;
      }
      setApplying(false);
    } catch {
      setError('');
      setApplying(false);
    } finally {
      busyRef.current = false;
    }
  }, [applyIfReady]);

  useEffect(() => {
    if (__DEV__) return;

    let cancelled = false;

    void (async () => {
      const Updates = await loadUpdatesModule();
      if (cancelled || !Updates) return;
      updatesRef.current = Updates;
      void checkForUpdate(true);
    })();

    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') void checkForUpdate(false);
    };

    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [checkForUpdate]);

  return { applying, error };
}
