import { forwardRef } from 'react';
import { hasNativeExpoCamera } from '@/lib/expo-camera-optional';

type Props = {
  active: boolean;
  onReady: () => void;
};

export type MealLiveCameraPreviewRef = {
  takePictureAsync?: (options?: { quality?: number }) => Promise<{ uri?: string } | undefined>;
};

type ImplComponent = React.ComponentType<
  Props & { ref?: React.Ref<MealLiveCameraPreviewRef> }
>;

let cachedImpl: ImplComponent | null | undefined;

function loadImpl(): ImplComponent | null {
  if (cachedImpl !== undefined) return cachedImpl;
  if (!hasNativeExpoCamera()) {
    cachedImpl = null;
    return null;
  }
  try {
    cachedImpl = require('./MealLiveCameraPreview.impl').default as ImplComponent;
  } catch {
    cachedImpl = null;
  }
  return cachedImpl;
}

/** Só carrega expo-camera se o binário tiver ExpoCamera (evita crash no build 14 + OTA). */
const MealLiveCameraPreview = forwardRef<MealLiveCameraPreviewRef, Props>(
  function MealLiveCameraPreview(props, ref) {
    const Impl = loadImpl();
    if (!Impl) return null;
    return <Impl ref={ref} {...props} />;
  },
);

export default MealLiveCameraPreview;
