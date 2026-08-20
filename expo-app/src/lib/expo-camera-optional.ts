import { requireOptionalNativeModule } from 'expo-modules-core';

export function hasNativeExpoCamera() {
  return Boolean(
    requireOptionalNativeModule('ExpoCamera')
    || requireOptionalNativeModule('CameraViewModule'),
  );
}
