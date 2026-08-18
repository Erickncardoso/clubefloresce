import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import type { ViewToken } from 'react-native';
import {
  loadSeenDiaryLikes,
  markDiaryLikesSeen,
  unseenLikedEntryIds,
} from '@/lib/diary-seen-likes';

type LikedEntry = { id: string; likesCount?: number };

const HIGHLIGHT_MS = 1400;

export const DIARY_LIKE_VIEWABILITY = {
  itemVisiblePercentThreshold: 42,
  minimumViewTime: 80,
};

export function useDiaryNewLikes() {
  const [highlightIds, setHighlightIds] = useState<string[]>([]);
  const unseenRef = useRef(new Set<string>());
  const viewableRef = useRef<string[]>([]);
  const entriesRef = useRef<LikedEntry[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const playVisible = useCallback(async () => {
    const ids = viewableRef.current.filter((id) => unseenRef.current.has(id));
    if (!ids.length) return;

    const entries = entriesRef.current.filter((item) => ids.includes(item.id));
    ids.forEach((id) => unseenRef.current.delete(id));
    void markDiaryLikesSeen(entries);

    const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
    if (reduceMotion) return;

    setHighlightIds((current) => [...new Set([...current, ...ids])]);
    const timer = setTimeout(() => {
      setHighlightIds((current) => current.filter((id) => !ids.includes(id)));
    }, HIGHLIGHT_MS);
    timersRef.current.push(timer);
  }, []);

  const syncUnseen = useCallback(async (list: LikedEntry[], mode: 'replace' | 'append') => {
    entriesRef.current = mode === 'replace' ? list : [...entriesRef.current, ...list];
    if (mode === 'replace') setHighlightIds([]);
    const seen = await loadSeenDiaryLikes();
    const fresh = unseenLikedEntryIds(list, seen);
    if (mode === 'replace') unseenRef.current = new Set(fresh);
    else fresh.forEach((id) => unseenRef.current.add(id));
    await playVisible();
  }, [playVisible]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    viewableRef.current = viewableItems
      .map((token) => token.item?.id)
      .filter((id): id is string => Boolean(id));
    void playVisible();
  }).current;

  const acknowledge = useCallback((entry: LikedEntry) => {
    unseenRef.current.delete(entry.id);
    setHighlightIds((current) => current.filter((id) => id !== entry.id));
    void markDiaryLikesSeen([entry]);
  }, []);

  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
  }, []);

  return { highlightIds, syncUnseen, onViewableItemsChanged, acknowledge };
}
