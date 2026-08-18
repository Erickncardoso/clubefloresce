import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppleBottomSheet from '@/components/ui/AppleBottomSheet';
import { fonts, spacing } from '@/theme/tokens';

export const CHAMADA_BG_PRESETS = [
  { id: 'office', label: 'Consultório', colors: ['#1a2433', '#3d5668'] },
  { id: 'shelf', label: 'Estante', colors: ['#2a2218', '#6a5340'] },
  { id: 'plant', label: 'Plantas', colors: ['#142e24', '#3d7a58'] },
  { id: 'soft', label: 'Sala clara', colors: ['#e6e2d8', '#b8c9d9'] },
] as const;

type Props = {
  visible: boolean;
  mode: string;
  onClose: () => void;
  onSelect: (mode: string) => void;
};

export default function ChamadaBackgroundSheet({ visible, mode, onClose, onSelect }: Props) {
  return (
    <AppleBottomSheet visible={visible} onClose={onClose} maxHeightRatio={0.52}>
      <Text style={styles.title}>Fundos virtuais</Text>
      <Text style={styles.label}>Desfoque</Text>
      <View style={styles.row}>
        {[
          { id: 'none', label: 'Nenhum' },
          { id: 'soft', label: 'Suave' },
          { id: 'blur', label: 'Forte' },
        ].map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={[styles.chip, mode === item.id && styles.chipOn]}
          >
            <Text style={[styles.chipText, mode === item.id && styles.chipTextOn]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Planos de fundo</Text>
      <View style={styles.grid}>
        {CHAMADA_BG_PRESETS.map((bg) => {
          const selected = mode === `image:${bg.id}`;
          return (
            <Pressable
              key={bg.id}
              onPress={() => onSelect(`image:${bg.id}`)}
              style={[
                styles.preset,
                { backgroundColor: bg.colors[1] },
                selected && styles.presetOn,
              ]}
            >
              <Text style={styles.presetText}>{bg.label}</Text>
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
    marginBottom: spacing[3],
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing[3],
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderRadius: 999,
    backgroundColor: '#f2f2f7',
  },
  chipOn: {
    backgroundColor: '#1c3d32',
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#1c1c1e',
  },
  chipTextOn: {
    color: '#fff',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  preset: {
    width: '48%',
    flexGrow: 1,
    minHeight: 64,
    borderRadius: 14,
    justifyContent: 'flex-end',
    padding: 10,
  },
  presetOn: {
    borderWidth: 2,
    borderColor: '#1c3d32',
  },
  presetText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#fff',
  },
});
