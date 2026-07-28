import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Layers } from 'lucide-react-native';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = {
  open: boolean;
  slotsLabel: string;
  onChoose: () => void;
};

export default function DietaMealPlanOptionsIntroModal({ open, slotsLabel, onChoose }: Props) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onChoose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Layers size={22} color="#62785a" />
          </View>
          <Text style={styles.title}>Escolha as opções do seu cardápio</Text>
          <Text style={styles.copy}>
            Seu plano tem mais de uma opção em algumas refeições
            {slotsLabel ? ` (${slotsLabel})` : ''}. Escolha qual deseja seguir — fica salva no app.
          </Text>
          <Text style={styles.note}>
            Depois você pode alterar quando quiser pelo botão <Text style={styles.noteStrong}>Trocar opção</Text> na refeição.
          </Text>
          <Pressable style={styles.cta} onPress={onChoose}>
            <Text style={styles.ctaText}>Escolher opções</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(21,24,20,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[5],
  },
  card: {
    width: '100%',
    maxWidth: 352,
    backgroundColor: '#fff',
    borderRadius: radii.surface,
    padding: spacing[5],
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff4ec',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  copy: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: '#5f675c',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing[3],
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#6f756d',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing[3],
    padding: spacing[3],
    borderRadius: 12,
    backgroundColor: '#f5f7f3',
  },
  noteStrong: { fontFamily: fonts.semibold, color: '#4f5a4a' },
  cta: {
    width: '100%',
    minHeight: 48,
    marginTop: spacing[4],
    borderRadius: 14,
    backgroundColor: '#7d9073',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontFamily: fonts.semibold, fontSize: 14, color: '#fff' },
});
