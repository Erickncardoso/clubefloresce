import { useCallback, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PickedMealPhoto } from '@/lib/meal-photo-pick';

const STORAGE_KEY = 'cf-meal-photo-tips-v3';

function runAfterOverlay(action: () => void) {
  InteractionManager.runAfterInteractions(() => {
    setTimeout(action, 320);
  });
}

export type MealPhotoTakeFn = (fromCamera: boolean, photo?: PickedMealPhoto) => void;

export function useMealPhotoTips(takePhoto: MealPhotoTakeFn) {
  const takeRef = useRef(takePhoto);
  takeRef.current = takePhoto;
  const pendingCamera = useRef(true);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const stageOpenRef = useRef(false);
  stageOpenRef.current = stageOpen;

  const requestPhoto = useCallback(async (fromCamera: boolean) => {
    pendingCamera.current = fromCamera;
    const seen = (await AsyncStorage.getItem(STORAGE_KEY)) === '1';

    if (!fromCamera) {
      if (seen) {
        takeRef.current(false);
        return;
      }
      setTipsOpen(true);
      return;
    }

    setStageOpen(true);
    if (!seen) setTipsOpen(true);
  }, []);

  const confirmTips = useCallback(() => {
    void AsyncStorage.setItem(STORAGE_KEY, '1');
    setTipsOpen(false);
    if (stageOpenRef.current) return;
    takeRef.current(pendingCamera.current);
  }, []);

  const dismissTips = useCallback(() => {
    setTipsOpen(false);
  }, []);

  const dismissStage = useCallback(() => {
    setStageOpen(false);
    setTipsOpen(false);
  }, []);

  const captureFromStage = useCallback((fromCamera: boolean) => {
    setTipsOpen(false);
    runAfterOverlay(() => takeRef.current(fromCamera));
  }, []);

  const onStageCaptured = useCallback((photo: PickedMealPhoto) => {
    setTipsOpen(false);
    takeRef.current(true, photo);
  }, []);

  const reopenTips = useCallback(() => {
    setTipsOpen(true);
  }, []);

  return {
    tipsOpen,
    stageOpen,
    requestPhoto,
    confirmTips,
    dismissTips,
    dismissStage,
    captureFromStage,
    onStageCaptured,
    reopenTips,
  };
}
