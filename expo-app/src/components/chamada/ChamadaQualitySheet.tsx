import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppleBottomSheet from '@/components/ui/AppleBottomSheet';
import { fonts, spacing } from '@/theme/tokens';

export type ChamadaVideoQuality = 'auto' | '720' | '1080';

export const CHAMADA_QUALITY_OPTIONS: Array<{
  id: ChamadaVideoQuality;
  label: string;
  hint: string;
}> = [
  { id: 'auto', label: 'Automática', hint: 'Adapta à conexão' },
  { id: '720', label: '720p', hint: 'Equilibrada' },
  { id: '1080', label: '1080p', hint: 'Full HD' },
];

type Props = {
  visible: boolean;
  quality: ChamadaVideoQuality;
  onClose: () => void;
  onSelect: (quality: ChamadaVideoQuality) => void;
};

export default function ChamadaQualitySheet({ visible, quality, onClose, onSelect }: Props) {
  return (
    <AppleBottomSheet visible={visible} onClose={onClose} maxHeightRatio={0.42}>
      <Text style={styles.title}>Qualidade do vídeo</Text>
      <Text style={styles.subtitle}>Afeta o vídeo recebido e enviado na consulta.</Text>
      <View style={styles.list}>
        {CHAMADA_QUALITY_OPTIONS.map((item) => {
          const selected = quality === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => onSelect(item.id)}
              style={[styles.option, selected && styles.optionOn]}
            >
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, selected && styles.optionLabelOn]}>{item.label}</Text>
                <Text style={[styles.optionHint, selected && styles.optionHintOn]}>{item.hint}</Text>
              </View>
              {selected ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </AppleBottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: '#1c1c1e',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#6b7280',
    marginBottom: spacing[3],
  },
  list: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#f2f2f7',
  },
  optionOn: {
    backgroundColor: '#1c3d32',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: '#1c1c1e',
  },
  optionLabelOn: {
    color: '#fff',
  },
  optionHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#6b7280',
  },
  optionHintOn: {
    color: 'rgba(255,255,255,0.78)',
  },
  check: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
  },
});
