import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Pencil, Share } from 'lucide-react-native';
import { colors, fonts, radii } from '@/theme/tokens';

type Props = {
  open: boolean;
  top: number;
  onClose: () => void;
  onEdit: () => void;
  onShare: () => void;
};

export default function MealConfirmMoreMenu({ open, top, onClose, onEdit, onShare }: Props) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.anchor, { top }]} pointerEvents="box-none">
          <Pressable onPress={() => {}}>
            <BlurView intensity={36} tint="light" style={styles.card}>
            <Pressable
              style={styles.row}
              onPress={() => {
                onClose();
                onEdit();
              }}
            >
              <Pencil color={colors.text} size={18} strokeWidth={1.8} />
              <Text style={styles.label}>Editar</Text>
            </Pressable>
            <View style={styles.line} />
            <Pressable
              style={styles.row}
              onPress={() => {
                onClose();
                onShare();
              }}
            >
              <Share color={colors.text} size={18} strokeWidth={1.8} />
              <Text style={styles.label}>Compartilhar</Text>
            </Pressable>
          </BlurView>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  anchor: {
    position: 'absolute',
    right: 16,
  },
  card: {
    minWidth: 188,
    borderRadius: radii.control,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  line: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(26,26,26,0.12)',
    marginHorizontal: 12,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
  },
});
