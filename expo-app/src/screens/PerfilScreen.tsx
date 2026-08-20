import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { ChevronRight, Pencil } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import ProfileAvatarPickerSheet from '@/components/profile/ProfileAvatarPickerSheet';
import ProfileFieldEditSheet, { type ProfileEditField } from '@/components/profile/ProfileFieldEditSheet';
import DeleteAccountAction from '@/components/account/DeleteAccountAction';
import PatientScrollView from '@/components/ui/PatientScrollView';
import PatientShell from '@/components/PatientShell';
import PatientAvatar from '@/components/ui/PatientAvatar';
import PatientHeader from '@/components/ui/PatientHeader';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { useAppToast } from '@/hooks/useAppToast';
import { PATIENT_NUTRITIONIST_NAME } from '@/config/patient-brand';
import { useProfileAvatar } from '@/hooks/useProfileAvatar';
import { usePatientApi } from '@/hooks/usePatientApi';
import { maskBirthDateBr, maskCpf, maskPhoneBr, onlyDigits, parseBirthDateBrToIso } from '@/lib/masks';
import {
  cpfToDraft,
  displayCpf,
  displayGender,
  displayMarital,
  displayOccupation,
  displayPhone,
  formatProfileBirthDate,
  isoToBirthDateBr,
  phoneToDraft,
} from '@/lib/profile-labels';
import { resolveMediaUrl } from '@/lib/media-url';
import { useAuth, type PatientProfileData } from '@/providers/AuthProvider';
import { colors, fonts, spacing } from '@/theme/tokens';

type ProfileResponse = {
  profile?: PatientProfileData;
};

export default function PerfilScreen() {
  const router = useRouter();
  const { user, refreshUser, updateProfileName, updateProfilePhone, saveProfile } = useAuth();
  const { request } = usePatientApi();
  const { toastError, toastSuccess } = useAppToast();
  const {
    uploading,
    message,
    error,
    pickFromGallery,
    takePhoto,
    clearMessage,
  } = useProfileAvatar();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PatientProfileData>({});
  const [editField, setEditField] = useState<ProfileEditField | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    await refreshUser();
    try {
      const data = await request<ProfileResponse>('/patient-profile/me');
      setProfile(data.profile || {});
    } catch {
      setProfile({});
    } finally {
      setLoading(false);
    }
  }, [refreshUser, request]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!message) return;
    if (error) toastError('Foto do perfil', message);
    else toastSuccess('Foto do perfil', message);
    clearMessage();
  }, [clearMessage, error, message, toastError, toastSuccess]);

  const avatarUrl = resolveMediaUrl(user?.avatar);

  async function handlePickGallery() {
    await pickFromGallery();
  }

  async function handleTakePhoto() {
    await takePhoto();
  }

  function openEdit(field: ProfileEditField, initial = '') {
    setSaveError('');
    setDraft(initial);
    setEditField(field);
  }

  function closeEdit() {
    if (saving) return;
    setEditField(null);
    setDraft('');
    setSaveError('');
  }

  async function reloadProfile() {
    const data = await request<ProfileResponse>('/patient-profile/me');
    setProfile(data.profile || {});
  }

  async function saveEdit(): Promise<boolean> {
    if (!editField) return false;
    setSaving(true);
    setSaveError('');
    try {
      if (editField === 'name') {
        const name = draft.replace(/\s+/g, ' ').trim();
        if (name.length < 2) {
          setSaveError('Informe um nome com pelo menos 2 caracteres.');
          return false;
        }
        await updateProfileName(name);
      }

      if (editField === 'birthDate') {
        const iso = parseBirthDateBrToIso(draft);
        if (!iso) {
          setSaveError('Use o formato DD/MM/AAAA.');
          return false;
        }
        await saveProfile({ birthDate: iso });
        await reloadProfile();
      }

      if (editField === 'phone') {
        const digits = onlyDigits(draft, 11);
        if (digits && digits.length < 10) {
          setSaveError('Informe DDD + número (mínimo 10 dígitos).');
          return false;
        }
        await updateProfilePhone(digits || null);
      }

      if (editField === 'cpf') {
        const digits = onlyDigits(draft, 11);
        if (digits && digits.length !== 11) {
          setSaveError('CPF deve ter 11 dígitos.');
          return false;
        }
        await saveProfile({ cpf: digits || null });
        await reloadProfile();
      }

      if (editField === 'occupation') {
        const occupation = draft.replace(/\s+/g, ' ').trim();
        if (occupation.length > 80) {
          setSaveError('Profissão muito longa (máximo 80 caracteres).');
          return false;
        }
        await saveProfile({ occupation: occupation || null });
        await reloadProfile();
      }

      closeEdit();
      return true;
    } catch (err) {
      setSaveError((err as Error).message || 'Não foi possível salvar.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function pickOption(value: string): Promise<boolean> {
    if (!editField) return false;
    setSaving(true);
    try {
      if (editField === 'gender') {
        await saveProfile({ gender: value as PatientProfileData['gender'] });
      }
      if (editField === 'maritalStatus') {
        await saveProfile({ maritalStatus: value as PatientProfileData['maritalStatus'] });
      }
      await reloadProfile();
      closeEdit();
      return true;
    } catch (err) {
      Alert.alert('Erro', (err as Error).message || 'Não foi possível salvar.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  function showNutritionistInfo() {
    Alert.alert(
      PATIENT_NUTRITIONIST_NAME,
      'Sua nutricionista responsável pelo Clube Florescer. Dados de consulta e acompanhamento são gerenciados pela equipe.',
    );
  }

  return (
    <PatientShell>
      <PatientHeader />

      {loading ? (
        <LoadingScreen />
      ) : (
        <PatientScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.summary}>
            <View style={styles.avatarWrap}>
              <PatientAvatar src={avatarUrl} name={user?.name} size="lg" />
              <Pressable
                style={styles.avatarEdit}
                accessibilityRole="button"
                accessibilityLabel="Alterar foto do perfil"
                disabled={uploading}
                onPress={() => setAvatarSheetOpen(true)}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Pencil color="#fff" size={12} strokeWidth={2.2} />
                )}
              </Pressable>
            </View>

            <View style={styles.summaryCopy}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Nome</Text>
                <Text style={styles.summaryValue} numberOfLines={2}>
                  {user?.name?.trim() || 'Paciente'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Email</Text>
                <Text style={styles.summaryValue} numberOfLines={2}>
                  {user?.email?.trim() || '-'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.list}>
            <ProfileRow
              label="Nome"
              value={user?.name?.trim() || '-'}
              editable
              onPress={() => openEdit('name', user?.name?.trim() || '')}
            />
            <ProfileRow
              label="Nutricionista"
              value={PATIENT_NUTRITIONIST_NAME}
              editable
              onPress={showNutritionistInfo}
            />
            <ProfileRow
              label="Telefone"
              value={displayPhone(user?.phone)}
              editable
              onPress={() => openEdit('phone', phoneToDraft(user?.phone))}
            />
            <ProfileRow
              label="CPF"
              value={displayCpf(profile.cpf)}
              editable
              onPress={() => openEdit('cpf', cpfToDraft(profile.cpf))}
            />
            <ProfileRow
              label="Aniversário"
              value={formatProfileBirthDate(profile.birthDate)}
              editable
              onPress={() => openEdit('birthDate', isoToBirthDateBr(profile.birthDate))}
            />
            <ProfileRow
              label="Profissão"
              value={displayOccupation(profile)}
              editable
              onPress={() => openEdit('occupation', profile.occupation?.trim() || '')}
            />
            <ProfileRow
              label="Sexo"
              value={displayGender(profile)}
              editable
              onPress={() => openEdit('gender', profile.gender || '')}
            />
            <ProfileRow
              label="Estado Civil"
              value={displayMarital(profile)}
              editable
              onPress={() => openEdit('maritalStatus', profile.maritalStatus || '')}
              last
            />
          </View>

          <Text style={styles.sectionEyebrow}>Segurança & Conta</Text>
          <View style={styles.securityList}>
            <Pressable
              style={[styles.deleteRow, styles.rowBorder]}
              accessibilityRole="button"
              onPress={() => router.push('/esqueci-senha' as never)}
            >
              <Text style={styles.passwordLabel}>Alterar senha</Text>
              <ChevronRight color="#c7c7cc" size={16} strokeWidth={2} />
            </Pressable>
            <DeleteAccountAction
              trigger={(open) => (
                <Pressable
                  style={styles.deleteRow}
                  accessibilityRole="button"
                  onPress={open}
                >
                  <Text style={styles.deleteLabel}>Apagar minha conta</Text>
                  <ChevronRight color="#e5484d" size={16} strokeWidth={2} />
                </Pressable>
              )}
            />
          </View>
        </PatientScrollView>
      )}

      <ProfileAvatarPickerSheet
        visible={avatarSheetOpen}
        uploading={uploading}
        onClose={() => setAvatarSheetOpen(false)}
        onPickGallery={handlePickGallery}
        onTakePhoto={handleTakePhoto}
      />

      <ProfileFieldEditSheet
        visible={editField !== null}
        field={editField}
        draft={draft}
        saving={saving}
        error={saveError}
        onClose={closeEdit}
        onChangeDraft={(value) => {
          if (editField === 'birthDate') {
            setDraft(maskBirthDateBr(value));
            return;
          }
          if (editField === 'phone') {
            setDraft(maskPhoneBr(value));
            return;
          }
          if (editField === 'cpf') {
            setDraft(maskCpf(value));
            return;
          }
          setDraft(value);
        }}
        onSave={saveEdit}
        onPickOption={pickOption}
      />
    </PatientShell>
  );
}

function ProfileRow({
  label,
  value,
  editable = false,
  onPress,
  last = false,
}: {
  label: string;
  value: string;
  editable?: boolean;
  onPress?: () => void;
  last?: boolean;
}) {
  const content = (
    <>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
      {editable ? <ChevronRight color="#c7c7cc" size={16} strokeWidth={2} style={styles.rowChevron} /> : null}
    </>
  );

  if (editable && onPress) {
    return (
      <Pressable
        style={[styles.row, !last && styles.rowBorder]}
        accessibilityRole="button"
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.row, !last && styles.rowBorder]}>{content}</View>;
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[8],
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[4],
    marginBottom: spacing[5],
  },
  avatarWrap: { position: 'relative' },
  avatarEdit: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8e8e93',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing[3],
    paddingTop: spacing[1],
  },
  summaryRow: { gap: 4 },
  summaryLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#8e8e93',
  },
  summaryValue: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  list: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: 11,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5ea',
  },
  rowLabel: {
    width: 118,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'left',
  },
  rowValue: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    textAlign: 'left',
  },
  rowChevron: {
    marginLeft: spacing[2],
  },
  sectionEyebrow: {
    marginTop: spacing[6],
    marginBottom: spacing[2],
    marginLeft: 4,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#aeaeb2',
  },
  securityList: {
    overflow: 'hidden',
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: 11,
  },
  deleteLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: '#e5484d',
    textAlign: 'left',
  },
  passwordLabel: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    textAlign: 'left',
  },
});
