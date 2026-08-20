import { forwardRef, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

type Props = {
  active: boolean;
  onReady: () => void;
};

const MealLiveCameraPreviewImpl = forwardRef<CameraView, Props>(function MealLiveCameraPreviewImpl(
  { active, onReady },
  ref,
) {
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (!active) return;
    if (permission && !permission.granted) {
      void requestPermission();
    }
  }, [active, permission, requestPermission]);

  if (!active || !permission?.granted) return null;

  return (
    <CameraView
      ref={ref}
      style={StyleSheet.absoluteFill}
      facing="back"
      mode="picture"
      onCameraReady={onReady}
    />
  );
});

export default MealLiveCameraPreviewImpl;
