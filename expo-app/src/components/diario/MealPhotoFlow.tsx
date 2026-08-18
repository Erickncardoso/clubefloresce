import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BellaMealConfirmModal, { type MealDraft } from '@/components/bella/BellaMealConfirmModal';
import ProfileAvatarPickerSheet from '@/components/profile/ProfileAvatarPickerSheet';
import { getApiBase, NATIVE_CLIENT_HEADER } from '@/config/env';
import { useAppToast } from '@/hooks/useAppToast';
import { usePatientApi } from '@/hooks/usePatientApi';
import { toastError, toastSuccess } from '@/lib/app-toast';
import type { MealDiaryItem } from '@/lib/meal-diary';
import { normalizeMealItemsForSave } from '@/lib/meal-diary';
import { pickMealPhoto } from '@/lib/meal-photo-pick';
import { patientAssets } from '@/lib/patient-assets';
import { patientTimeHeaders } from '@/lib/patient-local-time';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const ANALYZE_TIMEOUT_MS = 120_000;

export type MealPhotoTarget = {
  id: string;
  label?: string | null;
};

type Props = {
  meal: MealPhotoTarget | null;
  pickerOpen: boolean;
  onPickerClose: () => void;
  onSaved?: () => void;
};

export default function MealPhotoFlow({ meal, pickerOpen, onPickerClose, onSaved }: Props) {
  const { token, request } = usePatientApi();
  const { showToast } = useAppToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const analyzePhoto = useCallback(async (fromCamera: boolean) => {
    const target = meal;
    if (!target?.id) {
      showToast(toastError('Refeição indisponível', 'Abra de novo a refeição e tire a foto.'));
      return;
    }
    if (!token) {
      showToast(toastError('Sessão expirada', 'Entre de novo para a Bella analisar o prato.'));
      return;
    }

    let photo;
    try {
      photo = await pickMealPhoto(fromCamera);
    } catch (err) {
      showToast(toastError('Não foi possível abrir a foto', (err as Error).message));
      return;
    }
    if (!photo) return;

    setAnalyzing(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);

    try {
      const form = new FormData();
      form.append('topic', 'meal');
      form.append('taskHint', 'meal');
      form.append('mealType', target.id);
      form.append('mealLabel', target.label || 'Refeição');
      form.append(
        'message',
        `Analise SOMENTE o que aparece nesta foto do ${(target.label || 'prato').toLowerCase()}. Não use o plano alimentar.`,
      );
      form.append('file', {
        uri: photo.uri,
        name: photo.name,
        type: photo.mimeType,
      } as unknown as Blob);

      const response = await fetch(`${getApiBase()}/bella/chat`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'X-CF-Client': NATIVE_CLIENT_HEADER,
          ...patientTimeHeaders(),
        },
        body: form,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.message || 'A Bella não conseguiu analisar o prato.');
      }

      if (body.requiresMealConfirmation && body.mealDraft) {
        setDraft(body.mealDraft as MealDraft);
        setConfirmError('');
        setConfirmOpen(true);
        return;
      }

      const speech = String(body.message?.content || '').trim();
      showToast(toastError(
        'Não deu para registrar ainda',
        speech || 'A Bella não identificou os alimentos. Tente outra foto.',
      ));
    } catch (err) {
      const aborted = err instanceof Error && err.name === 'AbortError';
      showToast(toastError(
        'Análise indisponível',
        aborted ? 'A Bella demorou para responder. Tente de novo.' : (err as Error).message,
      ));
    } finally {
      clearTimeout(timer);
      setAnalyzing(false);
    }
  }, [meal, showToast, token]);

  async function confirmMeal(items: MealDiaryItem[]) {
    if (!draft || saving) return;
    setSaving(true);
    setConfirmError('');

    try {
      await request('/food-diary/confirm', {
        method: 'POST',
        body: JSON.stringify({
          items: normalizeMealItemsForSave(items),
          mealType: draft.mealType,
          mealLabel: draft.mealLabel,
          imageUrl: draft.imageUrl,
          userMessageId: draft.userMessageId,
          topic: 'meal',
        }),
      });
      setConfirmOpen(false);
      setDraft(null);
      showToast(toastSuccess('Refeição no diário', 'A Bella registrou o que tinha no prato.'));
      onSaved?.();
    } catch (err) {
      setConfirmError((err as Error).message || 'Não foi possível registrar a refeição.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ProfileAvatarPickerSheet
        visible={pickerOpen}
        title="Registrar refeição"
        onClose={onPickerClose}
        onPickGallery={() => void analyzePhoto(false)}
        onTakePhoto={() => void analyzePhoto(true)}
      />

      <Modal visible={analyzing} transparent animationType="fade">
        <View style={styles.analyzingWrap}>
          <View style={styles.analyzingCard}>
            <Image source={patientAssets.bellaAvatar} style={styles.bellaAvatar} />
            <ActivityIndicator color={colors.primaryDark} />
            <Text style={styles.analyzingTitle}>A Bella está olhando seu prato</Text>
            <Text style={styles.analyzingSub}>Isso leva alguns segundos.</Text>
          </View>
        </View>
      </Modal>

      <BellaMealConfirmModal
        open={confirmOpen}
        draft={draft}
        saving={saving}
        error={confirmError}
        onCancel={() => {
          setConfirmOpen(false);
          setDraft(null);
          setConfirmError('');
        }}
        onConfirm={confirmMeal}
      />
    </>
  );
}

const styles = StyleSheet.create({
  analyzingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,20,20,0.42)',
    padding: spacing[6],
  },
  analyzingCard: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[5],
    borderRadius: radii.surface,
    backgroundColor: '#fff',
  },
  bellaAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
  },
  analyzingTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  analyzingSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
