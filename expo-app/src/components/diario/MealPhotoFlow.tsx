import { useCallback, useRef, useState } from 'react';
import type { MealDraft } from '@/components/bella/BellaMealConfirmModal';
import MealPhotoCaptureOverlays from '@/components/bella/MealPhotoCaptureOverlays';
import ProfileAvatarPickerSheet from '@/components/profile/ProfileAvatarPickerSheet';
import { useMealPhotoTips } from '@/hooks/useMealPhotoTips';
import { getApiBase, NATIVE_CLIENT_HEADER } from '@/config/env';
import { useAppToast } from '@/hooks/useAppToast';
import { usePatientApi } from '@/hooks/usePatientApi';
import { useDiaryDate } from '@/hooks/useDiaryDate';
import { toastError, toastSuccess } from '@/lib/app-toast';
import type { MealDiaryItem } from '@/lib/meal-diary';
import { normalizeMealItemsForSave } from '@/lib/meal-diary';
import { pickMealPhoto, type PickedMealPhoto } from '@/lib/meal-photo-pick';
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
  const { foodDiaryPath, diaryHeaders } = useDiaryDate();
  const { showToast } = useAppToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [freezeUri, setFreezeUri] = useState<string | null>(null);
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const analyzeRef = useRef<(fromCamera: boolean, photo?: PickedMealPhoto) => void>(() => {});
  const {
    tipsOpen,
    stageOpen,
    requestPhoto,
    confirmTips,
    dismissTips,
    dismissStage,
    captureFromStage,
    onStageCaptured,
    reopenTips,
  } = useMealPhotoTips((fromCamera, photo) => {
    analyzeRef.current(fromCamera, photo);
  });

  const closeResult = useCallback(() => {
    setDraft(null);
    setConfirmError('');
    setFreezeUri(null);
    setAnalyzing(false);
    dismissStage();
  }, [dismissStage]);

  const analyzePhoto = useCallback(async (fromCamera: boolean, readyPhoto?: PickedMealPhoto) => {
    const target = meal;
    if (!target?.id) {
      showToast(toastError('Refeição indisponível', 'Abra de novo a refeição e tire a foto.'));
      return;
    }
    if (!token) {
      showToast(toastError('Sessão expirada', 'Entre de novo para a Bella analisar o prato.'));
      return;
    }

    let photo = readyPhoto;
    try {
      if (!photo) {
        const picked = await pickMealPhoto(fromCamera);
        if (!picked) return;
        photo = picked;
      }
    } catch (err) {
      showToast(toastError('Não foi possível abrir a foto', (err as Error).message));
      return;
    }
    if (!photo) return;

    setDraft(null);
    setConfirmError('');
    setFreezeUri(photo.uri);
    setAnalyzing(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);
    let keepFreeze = false;

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
          ...diaryHeaders(),
        },
        body: form,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.message || 'A Bella não conseguiu analisar o prato.');
      }

      if (body.requiresMealConfirmation && body.mealDraft) {
        const next = body.mealDraft as MealDraft;
        keepFreeze = true;
        setDraft({
          ...next,
          imageUrl: next.imageUrl || photo?.uri,
          mealType: target.id,
          mealLabel: target.label || 'Refeição',
        });
        setConfirmError('');
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
      if (!keepFreeze) {
        setFreezeUri(null);
        dismissStage();
      }
    }
  }, [dismissStage, diaryHeaders, meal, showToast, token]);

  analyzeRef.current = (fromCamera, photo) => {
    void analyzePhoto(fromCamera, photo);
  };

  async function confirmMeal(items: MealDiaryItem[]) {
    if (!draft || saving) return;
    const target = meal;
    setSaving(true);
    setConfirmError('');

    try {
      await request(foodDiaryPath('/food-diary/confirm'), {
        method: 'POST',
        body: JSON.stringify({
          items: normalizeMealItemsForSave(items),
          mealType: target?.id || draft.mealType,
          mealLabel: target?.label || draft.mealLabel,
          imageUrl: draft.imageUrl,
          userMessageId: draft.userMessageId,
          topic: 'meal',
        }),
      });
      closeResult();
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
        onPickGallery={() => void requestPhoto(false)}
        onTakePhoto={() => void requestPhoto(true)}
      />

      <MealPhotoCaptureOverlays
        tipsOpen={tipsOpen}
        stageOpen={stageOpen}
        analyzing={analyzing}
        freezeUri={freezeUri}
        draft={draft}
        saving={saving}
        error={confirmError}
        onDismissTips={dismissTips}
        onConfirmTips={confirmTips}
        onDismissStage={closeResult}
        onShutter={() => captureFromStage(true)}
        onGallery={() => captureFromStage(false)}
        onInfo={reopenTips}
        onCaptured={onStageCaptured}
        onConfirmMeal={confirmMeal}
        onCancelResult={closeResult}
        onCorrectResult={() => {
          closeResult();
          void requestPhoto(true);
        }}
      />
    </>
  );
}
