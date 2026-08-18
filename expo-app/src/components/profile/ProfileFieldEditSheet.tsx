import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check } from 'lucide-react-native';
import AppleBottomSheet, { useBottomSheetDismiss } from '@/components/ui/AppleBottomSheet';
import {
  GENDER_LABELS,
  MARITAL_LABELS,
} from '@/lib/profile-labels';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export type ProfileEditField =
  | 'name'
  | 'birthDate'
  | 'gender'
  | 'maritalStatus'
  | 'phone'
  | 'cpf'
  | 'occupation';

type Props = {
  visible: boolean;
  field: ProfileEditField | null;
  draft: string;
  saving?: boolean;
  error?: string;
  onClose: () => void;
  onChangeDraft: (value: string) => void;
  onSave: () => boolean | Promise<boolean>;
  onPickOption: (value: string) => boolean | Promise<boolean>;
};

const PICKER_TITLES: Partial<Record<ProfileEditField, string>> = {
  gender: 'Sexo',
  maritalStatus: 'Estado civil',
};

const FIELD_QUESTIONS: Partial<Record<ProfileEditField, string>> = {
  name: 'Qual seu nome?',
  birthDate: 'Qual sua data de nascimento?',
  phone: 'Qual seu telefone?',
  cpf: 'Qual seu CPF?',
  occupation: 'Qual sua profissão?',
};

const NUMERIC_FIELDS = new Set<ProfileEditField>(['birthDate', 'phone', 'cpf']);

const PICKER_OPTIONS: Partial<Record<ProfileEditField, Record<string, string>>> = {
  gender: GENDER_LABELS,
  maritalStatus: MARITAL_LABELS,
};

function SheetBody({
  field,
  draft,
  saving,
  error,
  onChangeDraft,
  onSave,
  onPickOption,
}: Omit<Props, 'visible' | 'onClose'>) {
  const { dismiss } = useBottomSheetDismiss();

  if (!field) return null;

  const isPicker = field === 'gender' || field === 'maritalStatus';
  const options = PICKER_OPTIONS[field];

  async function handleSave() {
    if (saving) return;
    const ok = await onSave();
    if (ok) dismiss();
  }

  async function handlePick(value: string) {
    if (saving) return;
    const ok = await onPickOption(value);
    if (ok) dismiss();
  }

  if (isPicker && options) {
    return (
      <>
        <Text style={styles.pickerTitle}>{PICKER_TITLES[field]}</Text>
        <View style={styles.group}>
          {Object.entries(options).map(([value, label], index, list) => (
            <View key={value}>
              <Pressable
                style={[styles.option, saving && styles.optionDisabled]}
                accessibilityRole="button"
                disabled={saving}
                onPress={() => void handlePick(value)}
              >
                <Text style={styles.optionLabel}>{label}</Text>
                {draft === value ? (
                  <Check color={colors.primary} size={18} strokeWidth={2.4} />
                ) : null}
              </Pressable>
              {index < list.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>
        {saving ? (
          <View style={styles.savingRow}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.savingText}>Salvando…</Text>
          </View>
        ) : null}
        <Pressable
          style={styles.cancelBtn}
          accessibilityRole="button"
          disabled={saving}
          onPress={dismiss}
        >
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </>
    );
  }

  return (
    <>
      <Text style={styles.question}>{FIELD_QUESTIONS[field]}</Text>
      <TextInput
        style={styles.underlineInput}
        value={draft}
        onChangeText={onChangeDraft}
        autoFocus
        autoCapitalize={field === 'name' || field === 'occupation' ? 'words' : 'none'}
        keyboardType={NUMERIC_FIELDS.has(field) ? 'number-pad' : 'default'}
        placeholder={
          field === 'birthDate'
            ? 'DD/MM/AAAA'
            : field === 'phone'
              ? '(11) 99999-9999'
              : field === 'cpf'
                ? '000.000.000-00'
                : field === 'occupation'
                  ? 'Sua profissão'
                  : 'Seu nome'
        }
        placeholderTextColor="#c7c7cc"
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        editable={!saving}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        accessibilityRole="button"
        disabled={saving}
        onPress={() => void handleSave()}
      >
        {saving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.saveBtnText}>Salvar</Text>
        )}
      </Pressable>
    </>
  );
}

export default function ProfileFieldEditSheet({
  visible,
  field,
  draft,
  saving = false,
  error = '',
  onClose,
  onChangeDraft,
  onSave,
  onPickOption,
}: Props) {
  const isPicker = field === 'gender' || field === 'maritalStatus';
  const maxHeightRatio = isPicker ? 0.52 : 0.42;

  return (
    <AppleBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeightRatio={maxHeightRatio}
      contentPadding={22}
      dismissible={!saving}
    >
      <SheetBody
        field={field}
        draft={draft}
        saving={saving}
        error={error}
        onChangeDraft={onChangeDraft}
        onSave={onSave}
        onPickOption={onPickOption}
      />
    </AppleBottomSheet>
  );
}

const styles = StyleSheet.create({
  pickerTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  question: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#b0b0b0',
    marginBottom: 6,
  },
  underlineInput: {
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.text,
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
  },
  group: {
    borderRadius: radii.surface,
    backgroundColor: '#f2f2f7',
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: spacing[4],
  },
  optionDisabled: {
    opacity: 0.55,
  },
  optionLabel: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#d1d1d6',
    marginLeft: spacing[4],
  },
  error: {
    marginTop: spacing[2],
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.error,
  },
  saveBtn: {
    marginTop: 22,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.65,
  },
  saveBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#fff',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  savingText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  cancelBtn: {
    marginTop: spacing[3],
    minHeight: 48,
    borderRadius: radii.surface,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
});
