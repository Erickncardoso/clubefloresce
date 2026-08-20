import { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Camera, Images, Info, X } from 'lucide-react-native';
import BellaMealConfirmModal, { type MealDraft } from '@/components/bella/BellaMealConfirmModal';
import MealAnalyzingSheet from '@/components/bella/MealAnalyzingSheet';
import MealLiveCameraPreview, {
  type MealLiveCameraPreviewRef,
} from '@/components/bella/MealLiveCameraPreview';
import MealScanLine from '@/components/bella/MealScanLine';
import { hasNativeExpoCamera } from '@/lib/expo-camera-optional';
import type { MealDiaryItem } from '@/lib/meal-diary';
import type { PickedMealPhoto } from '@/lib/meal-photo-pick';
import { patientAssets } from '@/lib/patient-assets';
import { triggerImpactHaptic } from '@/lib/picker-haptics';
import { fonts } from '@/theme/tokens';

type Props = {
  open: boolean;
  analyzing?: boolean;
  freezeUri?: string | null;
  draft?: MealDraft | null;
  saving?: boolean;
  error?: string;
  onClose: () => void;
  onShutter: () => void;
  onGallery: () => void;
  onInfo: () => void;
  onCaptured?: (photo: PickedMealPhoto) => void;
  onConfirmMeal?: (items: MealDiaryItem[]) => void;
  onCancelResult?: () => void;
  onCorrectResult?: () => void;
};

function Corner({ style }: { style: object }) {
  return <View style={[styles.corner, style]} />;
}

function ScanFrame({ height, onHeight }: { height: number; onHeight: (value: number) => void }) {
  return (
    <View
      style={styles.scanFrame}
      onLayout={(event) => onHeight(event.nativeEvent.layout.height)}
      pointerEvents="none"
    >
      <Corner style={styles.tl} />
      <Corner style={styles.tr} />
      <Corner style={styles.bl} />
      <Corner style={styles.br} />
      <MealScanLine height={height} />
    </View>
  );
}

export default function MealCameraStage({
  open,
  analyzing = false,
  freezeUri = null,
  draft = null,
  saving = false,
  error = '',
  onClose,
  onShutter,
  onGallery,
  onInfo,
  onCaptured,
  onConfirmMeal,
  onCancelResult,
  onCorrectResult,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const photoH = Math.round(height * 0.48);
  const cameraRef = useRef<MealLiveCameraPreviewRef>(null);
  const live = hasNativeExpoCamera();
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [frameHeight, setFrameHeight] = useState(0);
  const frozen = Boolean(freezeUri) && (analyzing || Boolean(draft));

  useEffect(() => {
    if (!open) setReady(false);
  }, [open]);

  async function handleShutter() {
    if (capturing) return;
    triggerImpactHaptic();
    if (live && cameraRef.current?.takePictureAsync && ready) {
      setCapturing(true);
      try {
        const picture = await cameraRef.current.takePictureAsync({ quality: 0.85 });
        if (picture?.uri) {
          onCaptured?.({
            uri: picture.uri,
            name: 'prato.jpg',
            mimeType: 'image/jpeg',
          });
          return;
        }
      } catch {
        // cai no seletor nativo
      } finally {
        setCapturing(false);
      }
    }
    onShutter();
  }

  function handleRequestClose() {
    if (draft) {
      onCancelResult?.();
      return;
    }
    if (analyzing) return;
    onClose();
  }

  return (
    <Modal visible={open} animationType="fade" onRequestClose={handleRequestClose}>
      {frozen ? (
        <View style={styles.root}>
          <View style={[styles.photoWell, { height: photoH }]}>
            {freezeUri ? (
              <Image source={{ uri: freezeUri }} style={styles.photoFill} resizeMode="cover" />
            ) : null}
            {analyzing && !draft ? (
              <ScanFrame height={frameHeight} onHeight={setFrameHeight} />
            ) : null}
          </View>
          <MealAnalyzingSheet />
          {draft && onConfirmMeal ? (
            <Animated.View entering={FadeIn.duration(320)} style={styles.resultLayer}>
              <BellaMealConfirmModal
                embedded
                open
                draft={draft}
                saving={saving}
                error={error}
                photoHeight={photoH}
                onCancel={onCancelResult || onClose}
                onConfirm={onConfirmMeal}
                onCorrect={onCorrectResult}
              />
            </Animated.View>
          ) : null}
        </View>
      ) : (
        <View style={styles.root}>
          {live ? (
            <MealLiveCameraPreview
              ref={cameraRef}
              active={open}
              onReady={() => setReady(true)}
            />
          ) : null}
          <View style={styles.chrome} pointerEvents="box-none">
            <View>
              <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
                <Pressable style={styles.iconBtn} onPress={onInfo} accessibilityLabel="Como fotografar">
                  <Info color="#fff" size={20} strokeWidth={1.8} />
                </Pressable>
                <View style={styles.brandWrap}>
                  <Image source={patientAssets.bellaAvatar} style={styles.brandAvatar} />
                  <Text style={styles.brand}>Bella</Text>
                </View>
                <Pressable style={styles.iconBtn} onPress={onClose} accessibilityLabel="Fechar">
                  <X color="#fff" size={20} strokeWidth={2.1} />
                </Pressable>
              </View>
              <View style={styles.hintRow}>
                <Text style={styles.hint}>Tire uma</Text>
                <Camera color="#fff" size={14} strokeWidth={2} />
                <Text style={styles.hintStrong}>foto</Text>
                <Text style={styles.hint}>do prato</Text>
              </View>
            </View>
            <View style={styles.frameWrap} pointerEvents="none">
              <View style={styles.guideFrame}>
                <Corner style={styles.tl} />
                <Corner style={styles.tr} />
                <Corner style={styles.bl} />
                <Corner style={styles.br} />
              </View>
            </View>
            <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 18) }]}>
              <View style={styles.controls}>
                <Pressable
                  style={styles.galleryBtn}
                  onPress={() => {
                    triggerImpactHaptic();
                    onGallery();
                  }}
                  accessibilityLabel="Galeria"
                >
                  <Images color="#fff" size={20} strokeWidth={1.8} />
                </Pressable>
                <Pressable
                  style={styles.shutter}
                  onPress={() => void handleShutter()}
                  accessibilityLabel="Tirar foto"
                >
                  <View style={styles.shutterInner} />
                </Pressable>
                <View style={styles.galleryBtn} />
              </View>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b0b0b',
  },
  photoWell: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#0b0b0b',
  },
  photoFill: {
    ...StyleSheet.absoluteFillObject,
  },
  resultLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 6,
  },
  scanFrame: {
    ...StyleSheet.absoluteFillObject,
    marginTop: 18,
    marginHorizontal: 22,
    marginBottom: 18,
  },
  chrome: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2a2a2a',
  },
  brand: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: '#fff',
  },
  hintRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: 'rgba(255,255,255,0.78)',
  },
  hintStrong: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: '#fff',
  },
  frameWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  guideFrame: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: '100%',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#fff',
  },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  bottom: {
    minHeight: 132,
    justifyContent: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 36,
  },
  galleryBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
});
