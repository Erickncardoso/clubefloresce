import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  dateKeyForOffset,
  DIARY_DATE_OPTIONS,
  formatDiaryDateLabel,
  compareDateKeys,
  withDiaryDateQuery,
} from '@/lib/diary-date';
import { getLocalDateKey, patientTimeHeaders } from '@/lib/patient-local-time';

let selectedDateKey = getLocalDateKey();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return selectedDateKey;
}

function setSelectedDateKey(next: string) {
  if (selectedDateKey === next) return;
  selectedDateKey = next;
  listeners.forEach((listener) => listener());
}

export function useDiaryDate() {
  const dateKey = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const isToday = useMemo(() => dateKey === getLocalDateKey(), [dateKey]);

  const diaryTitle = useMemo(() => {
    if (isToday) return 'Diário de hoje';
    return `Diário de ${formatDiaryDateLabel(dateKey)}`;
  }, [dateKey, isToday]);

  const setDateOffset = useCallback((offset: number) => {
    setSelectedDateKey(dateKeyForOffset(offset));
  }, []);

  const setDateKey = useCallback((next: string) => {
    const trimmed = String(next || '').trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return;
    if (compareDateKeys(trimmed, getLocalDateKey()) > 0) return;
    setSelectedDateKey(trimmed);
  }, []);

  const diaryHeaders = useCallback(
    (extra: Record<string, string> = {}) => patientTimeHeaders({ 'X-Patient-Date': dateKey, ...extra }),
    [dateKey],
  );

  const foodDiaryPath = useCallback(
    (path: string) => withDiaryDateQuery(path, dateKey),
    [dateKey],
  );

  return {
    selectedDateKey: dateKey,
    isToday,
    diaryTitle,
    diaryDateOptions: DIARY_DATE_OPTIONS,
    formatDiaryDateLabel,
    setDateOffset,
    setDateKey,
    diaryHeaders,
    foodDiaryPath,
  };
}
