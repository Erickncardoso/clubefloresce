import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowUp,
  FileText,
  Mic,
  X,
} from 'lucide-react-native';
import CameraIcon from '@/components/icons/CameraIcon';
import GalleryIcon from '@/components/icons/GalleryIcon';

import PatientScrollView from '@/components/ui/PatientScrollView';
import { PATIENT_NAV_PILL_MARGIN_X } from '@/lib/tab-bar';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const COMPOSER_ROW_HEIGHT = 52;
const TOOL_BTN_SIZE = 34;
const SEND_BTN_SIZE = 36;

export type BellaAttachmentPreview = {
  kind: 'image' | 'pdf' | 'audio';
  name: string;
  uri: string;
};

type MealOption = { id: string; label: string };

type Props = {
  chatTopic: string;
  mealOptions: MealOption[];
  selectedMealId: string | null;
  onSelectMeal: (id: string) => void;
  attachmentPreview: BellaAttachmentPreview | null;
  onClearAttachment: () => void;
  draft: string;
  onChangeDraft: (value: string) => void;
  composerPlaceholder: string;
  sending: boolean;
  swapSelectionLocked: boolean;
  canSend: boolean;
  onSend: () => void;
  acceptImages: boolean;
  acceptPdf: boolean;
  acceptAudio?: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onPickDocument: () => void;
  onPickAudio?: () => void;
  onComposerFocus?: () => void;
  /** Padding inferior (safe area) — controlado pela tela pai. */
  bottomInset?: number;
  /** Colado no teclado — remove folga superior do dock. */
  compact?: boolean;
};

export default function BellaChatComposer({
  chatTopic,
  mealOptions,
  selectedMealId,
  onSelectMeal,
  attachmentPreview,
  onClearAttachment,
  draft,
  onChangeDraft,
  composerPlaceholder,
  sending,
  swapSelectionLocked,
  canSend,
  onSend,
  acceptImages,
  acceptPdf,
  acceptAudio = false,
  onCamera,
  onGallery,
  onPickDocument,
  onPickAudio,
  onComposerFocus,
  bottomInset = 0,
  compact = false,
}: Props) {
  const showTools = acceptImages || acceptPdf || acceptAudio;
  const shellRounded = attachmentPreview ? styles.shellWithAttach : styles.shellPill;

  return (
    <View style={[styles.dock, compact && styles.dockCompact, bottomInset > 0 && { paddingBottom: bottomInset }]}>
      {chatTopic === 'meal' && mealOptions.length ? (
        <PatientScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mealRow}
        >
          <Text style={styles.mealLabel}>Refeição</Text>
          {mealOptions.map((meal) => {
            const active = selectedMealId === meal.id;
            return (
              <Pressable
                key={meal.id}
                style={[styles.mealChip, active && styles.mealChipActive]}
                onPress={() => onSelectMeal(meal.id)}
              >
                <Text style={[styles.mealChipText, active && styles.mealChipTextActive]}>
                  {meal.label}
                </Text>
              </Pressable>
            );
          })}
        </PatientScrollView>
      ) : null}

      <View style={[styles.shell, shellRounded]}>
        {attachmentPreview ? (
          <View style={styles.attachBlock}>
            {attachmentPreview.kind === 'image' ? (
              <View style={styles.attachImageWrap}>
                <Image source={{ uri: attachmentPreview.uri }} style={styles.attachImage} />
                <Pressable
                  style={styles.attachRemoveOverlay}
                  onPress={onClearAttachment}
                  accessibilityLabel="Remover imagem"
                >
                  <X size={14} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <View style={styles.attachFileRow}>
                <View style={styles.attachFileIcon}>
                  {attachmentPreview.kind === 'pdf' ? (
                    <FileText size={18} color={colors.primary} />
                  ) : (
                    <Mic size={18} color={colors.primary} />
                  )}
                </View>
                <View style={styles.attachFileCopy}>
                  <Text style={styles.attachFileTitle} numberOfLines={1}>
                    {attachmentPreview.name}
                  </Text>
                  <Text style={styles.attachFileMeta}>
                    {attachmentPreview.kind === 'audio' ? 'Áudio pronto para enviar' : 'Pronto para enviar'}
                  </Text>
                </View>
                <Pressable
                  style={styles.attachRemoveBtn}
                  onPress={onClearAttachment}
                  accessibilityLabel="Remover anexo"
                >
                  <X size={16} color={colors.textMuted} />
                </Pressable>
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.inputRow}>
          {showTools ? (
            <View style={styles.tools}>
              {acceptImages ? (
                <Pressable
                  style={styles.toolBtn}
                  disabled={sending}
                  onPress={onCamera}
                  accessibilityLabel="Tirar foto"
                >
                  <CameraIcon size={19} color={colors.textMuted} />
                </Pressable>
              ) : null}
              {acceptImages ? (
                <Pressable
                  style={styles.toolBtn}
                  disabled={sending}
                  onPress={onGallery}
                  accessibilityLabel="Escolher da galeria"
                >
                  <GalleryIcon size={19} color={colors.textMuted} />
                </Pressable>
              ) : null}
              {acceptPdf ? (
                <Pressable
                  style={styles.toolBtn}
                  disabled={sending}
                  onPress={onPickDocument}
                  accessibilityLabel="Anexar PDF"
                >
                  <FileText size={19} color={colors.textMuted} strokeWidth={1.75} />
                </Pressable>
              ) : null}
              {acceptAudio && onPickAudio ? (
                <Pressable
                  style={styles.toolBtn}
                  disabled={sending}
                  onPress={onPickAudio}
                  accessibilityLabel="Enviar áudio"
                >
                  <Mic size={19} color={colors.textMuted} strokeWidth={1.75} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={onChangeDraft}
            placeholder={composerPlaceholder}
            placeholderTextColor={colors.placeholder}
            multiline
            scrollEnabled
            textAlignVertical="center"
            blurOnSubmit={false}
            editable={!sending && !swapSelectionLocked}
            onFocus={onComposerFocus}
          />

          <Pressable
            style={[styles.sendBtn, (!canSend || sending) && styles.sendBtnDisabled]}
            onPress={onSend}
            disabled={!canSend || sending}
            accessibilityLabel="Enviar mensagem"
          >
            <ArrowUp color="#fff" size={18} strokeWidth={2.25} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const pillShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 6 },
  default: {},
});

const styles = StyleSheet.create({
  dock: {
    paddingHorizontal: PATIENT_NAV_PILL_MARGIN_X,
    paddingTop: spacing[2],
    backgroundColor: 'transparent',
    gap: spacing[2],
  },
  dockCompact: {
    paddingTop: 0,
    gap: spacing[1],
  },
  mealRow: { alignItems: 'center', gap: spacing[2], paddingBottom: spacing[1] },
  mealLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
    marginRight: spacing[1],
  },
  mealChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  mealChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  mealChipText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  mealChipTextActive: { color: colors.primaryDark },
  shell: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    ...pillShadow,
  },
  shellPill: { borderRadius: 32, minHeight: COMPOSER_ROW_HEIGHT },
  shellWithAttach: { borderRadius: radii.control },
  attachBlock: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 2 },
  attachImageWrap: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
  },
  attachImage: { width: '100%', height: '100%' },
  attachRemoveOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  attachFileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachFileCopy: { flex: 1, minWidth: 0 },
  attachFileTitle: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  attachFileMeta: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  attachRemoveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: COMPOSER_ROW_HEIGHT,
    gap: 4,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 8,
  },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    flexShrink: 0,
    height: TOOL_BTN_SIZE,
  },
  toolBtn: {
    width: TOOL_BTN_SIZE,
    height: TOOL_BTN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: TOOL_BTN_SIZE,
    maxHeight: 120,
    paddingHorizontal: 6,
    paddingTop: Platform.OS === 'ios' ? 8 : 6,
    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  sendBtn: {
    width: SEND_BTN_SIZE,
    height: SEND_BTN_SIZE,
    borderRadius: SEND_BTN_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    flexShrink: 0,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(139, 150, 124, 0.45)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  sendBtnDisabled: { opacity: 0.45 },
});
