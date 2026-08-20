import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

const POLL_MS = 8_000;

export function useOtaUpdateCheck() {
  const { isUpdateAvailable, isUpdatePending, isDownloading } = Updates.useUpdates();
  const [applying, setApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const enabled = Updates.isEnabled && !__DEV__;

  useEffect(() => {
    if (!enabled || dismissed || isUpdatePending || isDownloading) return;
    if (!isUpdateAvailable) return;
    void Updates.fetchUpdateAsync().catch(() => {});
  }, [dismissed, enabled, isDownloading, isUpdateAvailable, isUpdatePending]);

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      void Updates.checkForUpdateAsync().catch(() => {});
    };

    tick();
    const poll = setInterval(tick, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setDismissed(false);
      tick();
    });

    return () => {
      clearInterval(poll);
      sub.remove();
    };
  }, [enabled]);

  const applyUpdate = useCallback(async () => {
    if (!enabled || applying) return;
    setApplying(true);
    try {
      if (!isUpdatePending && isUpdateAvailable) {
        await Updates.fetchUpdateAsync();
      }
      await Updates.reloadAsync();
    } catch {
      setApplying(false);
    }
  }, [applying, enabled, isUpdateAvailable, isUpdatePending]);

  const ready = enabled && isUpdatePending && !dismissed;
  const downloading = enabled && !ready && !dismissed && (isDownloading || isUpdateAvailable);

  return {
    ready,
    downloading,
    applying,
    applyUpdate,
    dismiss: () => setDismissed(true),
  };
}
