import type { MealDraft } from '@/components/bella/BellaMealConfirmModal';
import MealCameraStage from '@/components/bella/MealCameraStage';
import MealPhotoTipsSheet from '@/components/bella/MealPhotoTipsSheet';
import type { MealDiaryItem } from '@/lib/meal-diary';
import type { PickedMealPhoto } from '@/lib/meal-photo-pick';

type Props = {
  tipsOpen: boolean;
  stageOpen: boolean;
  analyzing?: boolean;
  freezeUri?: string | null;
  draft?: MealDraft | null;
  saving?: boolean;
  error?: string;
  onDismissTips: () => void;
  onConfirmTips: () => void;
  onDismissStage: () => void;
  onShutter: () => void;
  onGallery: () => void;
  onInfo: () => void;
  onCaptured?: (photo: PickedMealPhoto) => void;
  onConfirmMeal?: (items: MealDiaryItem[]) => void;
  onCancelResult?: () => void;
  onCorrectResult?: () => void;
};

export default function MealPhotoCaptureOverlays({
  tipsOpen,
  stageOpen,
  analyzing = false,
  freezeUri = null,
  draft = null,
  saving = false,
  error = '',
  onDismissTips,
  onConfirmTips,
  onDismissStage,
  onShutter,
  onGallery,
  onInfo,
  onCaptured,
  onConfirmMeal,
  onCancelResult,
  onCorrectResult,
}: Props) {
  const resultOpen = Boolean(draft && freezeUri);
  const open = stageOpen || analyzing || resultOpen;

  return (
    <>
      <MealCameraStage
        open={open}
        analyzing={analyzing && !resultOpen}
        freezeUri={freezeUri}
        draft={resultOpen ? draft : null}
        saving={saving}
        error={error}
        onClose={onDismissStage}
        onShutter={onShutter}
        onGallery={onGallery}
        onInfo={onInfo}
        onCaptured={onCaptured}
        onConfirmMeal={onConfirmMeal}
        onCancelResult={onCancelResult}
        onCorrectResult={onCorrectResult}
      />
      <MealPhotoTipsSheet
        open={tipsOpen}
        onClose={onDismissTips}
        onContinue={onConfirmTips}
      />
    </>
  );
}
