import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import AppleBottomSheet, { useBottomSheetDismiss } from '@/components/ui/AppleBottomSheet';
import WeightRulerPicker from '@/components/evolucao/WeightRulerPicker';
import { formatWeightDisplay } from '@/lib/weight-progress';
import { colors, fonts, radii } from '@/theme/tokens';

type Props = {
  open: boolean;
  saving: boolean;
  error?: string;
  value: number | null;
  loading?: boolean;
  onClose: () => void;
  onChange: (value: number) => void;
  onSave: () => void;
};

function SheetBody({
  saving,
  error = '',
  value,
  loading = false,
  onChange,
  onSave,
}: Omit<Props, 'open' | 'onClose'>) {
  const { dismiss } = useBottomSheetDismiss();

  return (
    <>
      <Text style={styles.title}>Registrar peso</Text>
      <Text style={styles.hint}>Deslize a régua até o peso de hoje.</Text>
      {loading ? (
        <ActivityIndicator color={colors.primaryDark} style={{ marginVertical: 28 }} />
      ) : (
        <WeightRulerPicker value={value} onChange={onChange} />
      )}
      <Pressable
        style={[styles.saveBtn, (saving || value == null) && styles.saveBtnDisabled]}
        disabled={saving || value == null}
        onPress={onSave}
      >
        <Text style={styles.saveBtnText}>
          {saving ? 'Salvando…' : value != null ? `Salvar ${formatWeightDisplay(value)} kg` : 'Salvar peso'}
        </Text>
      </Pressable>
      <Pressable style={styles.cancelBtn} onPress={dismiss}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </>
  );
}

export default function WeightRegisterSheet({
  open,
  saving,
  error = '',
  value,
  loading = false,
  onClose,
  onChange,
  onSave,
}: Props) {
  return (
    <AppleBottomSheet visible={open} onClose={onClose} maxHeightRatio={0.52} contentPadding={20}>
      <SheetBody
        saving={saving}
        error={error}
        value={value}
        loading={loading}
        onChange={onChange}
        onSave={onSave}
      />
    </AppleBottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  saveBtn: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: radii.control,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#fff',
  },
  cancelBtn: {
    marginTop: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.textMuted,
  },
  error: {
    marginTop: 8,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.error,
    textAlign: 'center',
  },
});
