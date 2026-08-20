import { useState } from 'react';
import { Image, Modal, StyleSheet, View } from 'react-native';
import MealAnalyzingSheet from '@/components/bella/MealAnalyzingSheet';
import MealScanLine from '@/components/bella/MealScanLine';

type Props = {
  open: boolean;
  freezeUri?: string | null;
};

export default function MealAnalyzingFallback({ open, freezeUri }: Props) {
  const [height, setHeight] = useState(0);

  return (
    <Modal visible={open} animationType="fade">
      <View style={styles.root}>
        <View style={styles.photoWell}>
          {freezeUri ? (
            <Image source={{ uri: freezeUri }} style={styles.photo} resizeMode="cover" />
          ) : null}
          <View
            style={styles.scanFrame}
            onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
            pointerEvents="none"
          >
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            <MealScanLine height={height} />
          </View>
        </View>
        <MealAnalyzingSheet />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b0b0b',
  },
  photoWell: {
    flex: 1,
    overflow: 'hidden',
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
  },
  scanFrame: {
    ...StyleSheet.absoluteFillObject,
    marginTop: 18,
    marginHorizontal: 22,
    marginBottom: 18,
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#fff',
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
});
