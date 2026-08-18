import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View, type ViewStyle } from 'react-native';
import DefaultPatientAvatarIcon from '@/components/icons/DefaultPatientAvatarIcon';
import { resolveMediaUrl } from '@/lib/media-url';
import { colors } from '@/theme/tokens';

const SIZES = {
  sm: 32,
  md: 52,
  lg: 72,
  xl: 88,
} as const;

type Size = keyof typeof SIZES;

type Props = {
  src?: string | null;
  name?: string | null;
  size?: Size;
  style?: ViewStyle;
};

/** Avatar do paciente — foto ou silhueta padrão (sem iniciais). */
export default function PatientAvatar({ src, name, size = 'md', style }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const dimension = SIZES[size];
  const photoUri = useMemo(() => resolveMediaUrl(src), [src]);
  const showPhoto = Boolean(photoUri) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [photoUri]);

  return (
    <View
      style={[
        styles.wrap,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
        },
        !showPhoto && styles.wrapDefault,
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={name ? `Avatar de ${name}` : 'Avatar do paciente'}
    >
      {showPhoto ? (
        <Image
          source={{ uri: photoUri }}
          style={[
            styles.media,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
            },
          ]}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <DefaultPatientAvatarIcon size={dimension} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapDefault: {
    backgroundColor: 'transparent',
  },
  media: {
    backgroundColor: colors.primarySoft,
  },
});
