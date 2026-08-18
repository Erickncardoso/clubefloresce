import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '@/theme/tokens';

type Props = {
  name?: string;
  size?: 'lg' | 'sm';
  speaking?: boolean;
};

export function chamadaInitials(name?: string) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export default function ChamadaAvatar({ name, size = 'lg', speaking = false }: Props) {
  const isLarge = size === 'lg';
  const faceSize = isLarge ? 120 : 52;
  const ringSize = isLarge ? 120 : 52;
  const fontSize = isLarge ? 32 : 14;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.ring,
          styles.ringOuter,
          {
            width: ringSize + 8,
            height: ringSize + 8,
            borderRadius: (ringSize + 8) / 2,
            opacity: speaking ? 0.85 : 0.35,
          },
        ]}
      />
      <View
        style={[
          styles.ring,
          styles.ringInner,
          {
            width: ringSize + 4,
            height: ringSize + 4,
            borderRadius: (ringSize + 4) / 2,
            opacity: speaking ? 0.55 : 0.2,
          },
        ]}
      />
      <View
        style={[
          styles.face,
          {
            width: faceSize,
            height: faceSize,
            borderRadius: faceSize / 2,
          },
        ]}
      >
        <Text style={[styles.initials, { fontSize }]}>{chamadaInitials(name)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#8ab4f8',
  },
  ringOuter: {},
  ringInner: {},
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5f6368',
  },
  initials: {
    fontFamily: fonts.extrabold,
    color: '#e8eaed',
  },
});
