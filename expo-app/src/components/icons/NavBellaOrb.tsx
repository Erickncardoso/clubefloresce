import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

type Props = {
  active?: boolean;
  locked?: boolean;
  size?: number;
  style?: ViewStyle;
  children: ReactNode;
};

/** Versão estável (sem Reanimated) — aurora volta depois do OTA estabilizar. */
export default function NavBellaOrb({
  active = false,
  locked = false,
  size = 44,
  style,
  children,
}: Props) {
  const haloSize = size + 30;

  return (
    <View style={[styles.wrap, { width: haloSize, height: haloSize }, style]}>
      {!locked ? (
        <View style={styles.glowLayer} pointerEvents="none">
          <View style={[styles.blob, styles.blobGreen]} />
          <View style={[styles.blob, styles.blobPurple]} />
          <View style={[styles.blob, styles.blobCoral]} />
        </View>
      ) : null}

      <View
        style={[
          styles.orb,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: locked ? '#d1d1d6' : active ? '#7a8fd4' : '#8b967c',
            transform: [{ scale: active ? 1.06 : 1 }],
          },
          !locked && styles.orbRing,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  blob: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    opacity: 0.45,
  },
  blobGreen: {
    backgroundColor: '#8b967c',
    transform: [{ translateX: -6 }, { translateY: -4 }],
  },
  blobPurple: {
    backgroundColor: '#9b8fd4',
    transform: [{ translateX: 8 }, { translateY: 2 }],
  },
  blobCoral: {
    backgroundColor: '#d4927a',
    transform: [{ translateX: -2 }, { translateY: 8 }],
  },
  orb: {
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orbRing: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#8b7fd4',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
