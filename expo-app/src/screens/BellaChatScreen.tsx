import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import * as DocumentPicker from 'expo-document-picker';

import { pickMealPhoto, type PickedMealPhoto } from '@/lib/meal-photo-pick';
import { useMealPhotoTips } from '@/hooks/useMealPhotoTips';

import { useLocalSearchParams } from 'expo-router';

import {

  ArrowUp,

  Camera,

  FileText,

  ImagePlus,

  RefreshCw,

  X,

} from 'lucide-react-native';

import BellaMealConfirmModal, { type MealDraft } from '@/components/bella/BellaMealConfirmModal';
import MealPhotoCaptureOverlays from '@/components/bella/MealPhotoCaptureOverlays';
import BellaDailyDiaryBar from '@/components/dieta/BellaDailyDiaryBar';
import PatientHeader from '@/components/ui/PatientHeader';

import PatientScrollView from '@/components/ui/PatientScrollView';
import PatientShell from '@/components/PatientShell';

import { getApiBase, NATIVE_CLIENT_HEADER } from '@/config/env';

import type { DailySummary } from '@/hooks/useDietaDiarySync';

import { usePatientApi } from '@/hooks/usePatientApi';

import { usePatientMealPlan } from '@/hooks/usePatientMealPlan';

import { patientAssets } from '@/lib/patient-assets';

import {

  findActiveSwapMessage,

  findLatestCompletedSwapMessage,

  getSwapOptions,

  hasActiveSwapMode,

  hasActiveSwapSelection,

  isCompletedSwapMessage,

  type ChatMessage,

} from '@/lib/bella-swap';

import { getBellaTopicConfig, normalizeBellaTopic } from '@/lib/bella-topics';

import { normalizeMealItemsForSave, type MealDiaryItem } from '@/lib/meal-diary';
import { getMealIdForTimeFromMeals } from '@/lib/meal-plan-time';


import { resolveMediaUrl } from '@/lib/media-url';

import { patientTimeHeaders } from '@/lib/patient-local-time';

import { useAuth } from '@/providers/AuthProvider';

import { colors, fonts, radii, spacing } from '@/theme/tokens';



type AttachmentPreview = {

  kind: 'image' | 'pdf';

  name: string;

  uri: string;

};



type PendingFile = {

  uri: string;

  name: string;

  mimeType: string;

};



const BELLA_CHAT_TIMEOUT_MS = 120_000;



function normalizeMetadata(metadata: unknown) {

  if (!metadata) return null;

  if (typeof metadata === 'string') {

    try {

      return JSON.parse(metadata) as Record<string, unknown>;

    } catch {

      return null;

    }

  }

  return metadata as Record<string, unknown>;

}



function normalizeMessages(list: ChatMessage[] = []) {

  return list.map((msg) => ({

    ...msg,

    metadata: normalizeMetadata(msg.metadata),

  }));

}



function getUserMessageImage(msg?: ChatMessage | null) {

  const meta = msg?.metadata as Record<string, unknown> | null | undefined;

  const attachment = meta?.attachment as { type?: string; url?: string } | undefined;

  if (attachment?.type === 'image' && attachment.url) return resolveMediaUrl(String(attachment.url));

  return null;

}



function stripMarkdown(content: string) {

  return content

    .replace(/\*\*(.*?)\*\*/g, '$1')

    .replace(/\*(.*?)\*/g, '$1')

    .replace(/`(.*?)`/g, '$1');

}



export default function BellaChatScreen() {

  const params = useLocalSearchParams<{

    topic?: string;

    meal?: string;

    label?: string;

    from?: string;

    camera?: string;

  }>();

  const topicParam = Array.isArray(params.topic) ? params.topic[0] : params.topic;
  const chatTopic = useMemo(() => normalizeBellaTopic(topicParam), [topicParam]);
  const topicConfig = getBellaTopicConfig(chatTopic);

  const { user, token } = useAuth();

  const { request } = usePatientApi();

  const { meals, fetchPlan } = usePatientMealPlan();

  const scrollRef = useRef<React.ElementRef<typeof PatientScrollView>>(null);
  const bootstrapTokenRef = useRef(0);
  const autoCameraRef = useRef(false);
  const pickImageRef = useRef<(fromCamera: boolean, photo?: PickedMealPhoto) => void>(() => {});
  const lastMealPhotoUri = useRef<string | null>(null);
  const mealFreezeUriRef = useRef<string | null>(null);

  const [mealFreezeUri, setMealFreezeUri] = useState<string | null>(null);



  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [historyMessages, setHistoryMessages] = useState<ChatMessage[]>([]);

  const [showPreviousHistory, setShowPreviousHistory] = useState(false);

  const [draft, setDraft] = useState('');

  const [loadingMessages, setLoadingMessages] = useState(false);

  const [sending, setSending] = useState(false);

  const [error, setError] = useState('');

  const [selectedMealId, setSelectedMealId] = useState('');

  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);

  const [attachmentPreview, setAttachmentPreview] = useState<AttachmentPreview | null>(null);

  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);

  const [typingVisible, setTypingVisible] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [mealDraft, setMealDraft] = useState<MealDraft | null>(null);
  const [confirmingMeal, setConfirmingMeal] = useState(false);
  const [mealConfirmError, setMealConfirmError] = useState('');
  const { tipsOpen, stageOpen, requestPhoto, confirmTips, dismissTips, dismissStage, captureFromStage, onStageCaptured, reopenTips } = useMealPhotoTips((fromCamera, photo) => {
    pickImageRef.current(fromCamera, photo);
  });

  const userName = user?.name?.split(' ')[0] || 'você';



  const mealOptions = useMemo(() => {

    if (meals.length) return meals;

    return [

      { id: 'breakfast', label: 'Café da manhã' },

      { id: 'lunch', label: 'Almoço' },

      { id: 'snack', label: 'Lanche' },

      { id: 'dinner', label: 'Jantar' },

    ];

  }, [meals]);



  const selectedMeal = useMemo(

    () => mealOptions.find((meal) => meal.id === selectedMealId) || mealOptions[0],

    [mealOptions, selectedMealId],

  );



  const threadMessages = useMemo(

    () => normalizeMessages([...historyMessages, ...messages]),

    [historyMessages, messages],

  );



  const displayMessages = useMemo(() => {

    if (chatTopic === 'swap') return threadMessages;

    return showPreviousHistory ? threadMessages : messages;

  }, [chatTopic, messages, showPreviousHistory, threadMessages]);



  const activeSwapMessage = useMemo(

    () => (chatTopic === 'swap' ? findActiveSwapMessage(threadMessages) : null),

    [chatTopic, threadMessages],

  );



  const swapSelectionLocked = Boolean(

    activeSwapMessage && hasActiveSwapSelection(activeSwapMessage),

  );



  const composerPlaceholder = useMemo(() => {

    if (swapSelectionLocked) return 'Toque em uma sugestão abaixo';

    if (activeSwapMessage && hasActiveSwapMode(activeSwapMessage)) {

      return 'Digite o alimento que quer incluir...';

    }

    return topicConfig.placeholder;

  }, [activeSwapMessage, swapSelectionLocked, topicConfig.placeholder]);



  const canSend = Boolean(draft.trim() || pendingFile) && !swapSelectionLocked;



  const buildWelcomeContent = useCallback(() => {
    const mealLabel = typeof params.label === 'string' ? params.label.trim() : '';

    if (chatTopic === 'meal' && (params.from === 'dieta' || params.from === 'home') && mealLabel) {
      return `Olá, ${userName}! 📸 Vamos registrar ${mealLabel.toLowerCase()}. Confira a refeição selecionada abaixo e envie a foto do prato.`;
    }

    if (chatTopic === 'meal') {
      const label = selectedMeal?.label || 'sua refeição';
      return `Olá, ${userName}! 📸 Registrando ${label.toLowerCase()} — troque no seletor abaixo se precisar e envie a foto do prato.`;
    }

    return topicConfig.welcome(userName);
  }, [chatTopic, params.from, params.label, selectedMeal?.label, topicConfig, userName]);

  const seedWelcomeMessage = useCallback(() => {
    setMessages([{
      id: `welcome-${chatTopic}`,
      role: 'assistant',
      content: buildWelcomeContent(),
    }]);
  }, [buildWelcomeContent, chatTopic]);



  const initMealSelection = useCallback(() => {

    if (chatTopic !== 'meal' || !mealOptions.length) return;

    const queryMeal = typeof params.meal === 'string' ? params.meal.trim() : '';

    if (queryMeal && mealOptions.some((meal) => meal.id === queryMeal)) {

      setSelectedMealId(queryMeal);

      return;

    }

    const timeId = getMealIdForTimeFromMeals(mealOptions);

    setSelectedMealId(timeId && mealOptions.some((m) => m.id === timeId) ? timeId : mealOptions[0].id);

  }, [chatTopic, mealOptions, params.meal]);



  const fetchBellaChat = useCallback(async (options: RequestInit) => {

    const controller = new AbortController();

    const timer = setTimeout(() => controller.abort(), BELLA_CHAT_TIMEOUT_MS);

    try {

      const response = await fetch(`${getApiBase()}/bella/chat`, {

        ...options,

        signal: controller.signal,

        headers: {

          Accept: 'application/json',

          Authorization: `Bearer ${token}`,

          'X-CF-Client': NATIVE_CLIENT_HEADER,

          ...patientTimeHeaders(),

          ...(options.headers as Record<string, string> | undefined),

        },

      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {

        throw new Error(body?.message || 'Não foi possível falar com a Bella.');

      }

      return body;

    } finally {

      clearTimeout(timer);

    }

  }, [token]);



  const applyChatResponse = useCallback((res: Record<string, unknown>) => {
    if (res.requiresMealConfirmation && res.mealDraft) {
      const next = res.mealDraft as MealDraft;
      setMealDraft({ ...next, imageUrl: next.imageUrl || lastMealPhotoUri.current || undefined });
      if (res.dailySummary) setDailySummary(res.dailySummary as DailySummary);
      if (res.message) {
        const [assistantMessage] = normalizeMessages([res.message as ChatMessage]);
        if (assistantMessage) {
          setMessages((prev) => [...prev, assistantMessage]);
        }
      }
      setMealConfirmError('');
      setShowMealModal(!mealFreezeUriRef.current);
      return;
    }

    if (res.message) {
      const [assistantMessage] = normalizeMessages([res.message as ChatMessage]);
      if (assistantMessage) {
        setMessages((prev) => [...prev, assistantMessage]);
      }
      return;
    }

    setError('A Bella não conseguiu responder. Tente enviar novamente.');
  }, []);



  const postSwapChat = useCallback(async (

    body: Record<string, unknown>,

    userLabel = '',

  ) => {

    setError('');

    setSending(true);

    setTypingVisible(true);



    const tempId = `temp-${Date.now()}`;

    if (userLabel) {

      setMessages((prev) => [...prev, {

        id: tempId,

        role: 'user',

        content: userLabel,

        metadata: { topic: 'swap' },

      }]);

    }



    try {

      const form = new FormData();

      Object.entries(body).forEach(([key, value]) => {

        if (value != null) form.append(key, String(value));

      });



      const res = await fetchBellaChat({ method: 'POST', body: form });



      if (userLabel) {

        setMessages((prev) => {

          const index = prev.findIndex((m) => m.id === tempId);

          if (index < 0) return prev;

          const next = [...prev];

          if (res.userMessage) {

            next[index] = normalizeMessages([res.userMessage as ChatMessage])[0];

          }

          return next;

        });

      }



      applyChatResponse(res);

    } catch (err) {

      if (userLabel) {

        setMessages((prev) => prev.filter((m) => m.id !== tempId));

      }

      setError((err as Error).message);

    } finally {

      setTypingVisible(false);

      setSending(false);

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    }

  }, [applyChatResponse, fetchBellaChat]);



  const ensureSwapFlowStarted = useCallback(async () => {
    await postSwapChat({ topic: 'swap', swapAction: 'init' });
  }, [postSwapChat]);

  const loadDailySummary = useCallback(async () => {
    if (chatTopic !== 'meal') return;

    try {
      const summary = await request<DailySummary>('/food-diary/today');
      setDailySummary(summary);
    } catch { /* ignore */ }
  }, [chatTopic, request]);

  const loadMessages = useCallback(async (runToken?: number) => {
    setError('');
    setLoadingMessages(true);

    try {
      const data = await request<{
        messages?: ChatMessage[];
        dailySummary?: DailySummary;
      }>(`/bella/messages?topic=${encodeURIComponent(chatTopic)}`);

      if (runToken != null && bootstrapTokenRef.current !== runToken) return;

      const history = normalizeMessages(data.messages || []);
      setHistoryMessages(history);
      setShowPreviousHistory(history.length > 0);

      if (chatTopic !== 'swap') {
        seedWelcomeMessage();
      } else {
        setMessages([]);
      }

      if (data.dailySummary) setDailySummary(data.dailySummary);

      if (chatTopic === 'swap') {
        const thread = normalizeMessages(history);
        if (!findActiveSwapMessage(thread)) {
          await postSwapChat({ topic: 'swap', swapAction: 'init' });
        }
      }
    } catch (err) {
      if (runToken != null && bootstrapTokenRef.current !== runToken) return;
      setError((err as Error).message);
      if (chatTopic !== 'swap') seedWelcomeMessage();
      throw err;
    } finally {
      if (runToken == null || bootstrapTokenRef.current === runToken) {
        setLoadingMessages(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
      }
    }
  }, [chatTopic, postSwapChat, request, seedWelcomeMessage]);

  useEffect(() => {
    const runToken = ++bootstrapTokenRef.current;

    void (async () => {
      setError('');
      setMessages([]);
      setHistoryMessages([]);
      setShowPreviousHistory(false);
      setShowMealModal(false);
      setMealDraft(null);
      setMealConfirmError('');
      mealFreezeUriRef.current = null;
      setMealFreezeUri(null);

      try {
        if (chatTopic === 'meal') {
          await fetchPlan();
          if (bootstrapTokenRef.current !== runToken) return;
          initMealSelection();
        }

        await loadMessages(runToken);
        if (bootstrapTokenRef.current !== runToken) return;

        if (chatTopic === 'meal') {
          await loadDailySummary();
          if (bootstrapTokenRef.current !== runToken) return;
          initMealSelection();
        }
      } catch {
        if (bootstrapTokenRef.current !== runToken) return;
        if (chatTopic !== 'swap') seedWelcomeMessage();
      }
    })();
  }, [chatTopic]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loadingMessages || chatTopic !== 'meal' || !mealOptions.length) return;
    initMealSelection();
  }, [chatTopic, initMealSelection, loadingMessages, mealOptions.length]);

  useEffect(() => {
    if (chatTopic !== 'meal' || loadingMessages) return;
    setMessages((prev) => prev.map((msg) => (
      msg.id === `welcome-${chatTopic}`
        ? { ...msg, content: buildWelcomeContent() }
        : msg
    )));
  }, [buildWelcomeContent, chatTopic, loadingMessages, selectedMealId]);



  useEffect(() => {
    if ((params.from === 'dieta' || params.from === 'home') && chatTopic === 'meal') {
      const label = typeof params.label === 'string' ? params.label.trim() : '';
      if (label) setDraft(`Analise meu ${label.toLowerCase()}`);
    }
  }, [chatTopic, params.from, params.label]);

  function clearAttachment() {

    setAttachmentPreview(null);

    setPendingFile(null);

  }



  async function pickImage(fromCamera: boolean, readyPhoto?: PickedMealPhoto) {
    try {
      const photo = readyPhoto ?? await pickMealPhoto(fromCamera);
      if (!photo) return;

      lastMealPhotoUri.current = photo.uri;
      if (chatTopic === 'meal') {
        mealFreezeUriRef.current = photo.uri;
        setMealFreezeUri(photo.uri);
      }
      setError('');
      setPendingFile({
        uri: photo.uri,
        name: photo.name,
        mimeType: photo.mimeType,
      });
      setAttachmentPreview({
        kind: 'image',
        name: photo.name,
        uri: photo.uri,
      });
    } catch (err) {
      setError((err as Error).message || 'Permita acesso à câmera ou galeria para enviar fotos.');
    }
  }

  pickImageRef.current = (fromCamera, photo) => {
    void pickImage(fromCamera, photo);
  };

  function requestChatPhoto(fromCamera: boolean) {
    if (chatTopic === 'meal') {
      void requestPhoto(fromCamera);
      return;
    }
    void pickImage(fromCamera);
  }

  useEffect(() => {
    if (autoCameraRef.current) return;
    if (chatTopic !== 'meal' || loadingMessages || !selectedMealId) return;
    if (params.camera !== '1') return;
    autoCameraRef.current = true;
    const timer = setTimeout(() => {
      void requestChatPhoto(true);
    }, 450);
    return () => clearTimeout(timer);
  }, [chatTopic, loadingMessages, params.camera, selectedMealId]); // eslint-disable-line react-hooks/exhaustive-deps



  async function pickDocument() {

    const result = await DocumentPicker.getDocumentAsync({

      type: ['application/pdf', 'image/*'],

      copyToCacheDirectory: true,

    });

    if (result.canceled || !result.assets?.[0]) return;



    const asset = result.assets[0];

    const isPdf = asset.mimeType === 'application/pdf' || asset.name?.toLowerCase().endsWith('.pdf');

    if (isPdf && !topicConfig.acceptPdf) {

      setError('Neste chat só é possível enviar imagens.');

      return;

    }

    if (!isPdf && !topicConfig.acceptImages) {

      setError('Neste chat não é possível enviar imagens.');

      return;

    }



    setError('');

    setPendingFile({

      uri: asset.uri,

      name: asset.name || (isPdf ? 'documento.pdf' : 'foto.jpg'),

      mimeType: asset.mimeType || (isPdf ? 'application/pdf' : 'image/jpeg'),

    });

    setAttachmentPreview({

      kind: isPdf ? 'pdf' : 'image',

      name: asset.name || 'anexo',

      uri: isPdf ? '' : asset.uri,

    });

  }



  async function handleSwapSelection(option: { id: string; label: string }) {

    if (!activeSwapMessage?.id || sending) return;

    const meta = activeSwapMessage.metadata || {};

    const step = meta.swapStep;



    if (step === 'suggestion') {

      await postSwapChat({

        topic: 'swap',

        swapAction: 'custom_food',

        message: option.label,

        swapMealId: String(meta.swapMealId || ''),

        swapFoodKey: String(meta.swapFoodKey || ''),

        swapSelectionMessageId: activeSwapMessage.id,

      }, option.label);

      return;

    }



    if (step === 'food') {

      await postSwapChat({

        topic: 'swap',

        swapAction: 'select_food',

        swapMealId: String(meta.swapMealId || ''),

        swapFoodKey: option.id,

        swapSelectionMessageId: activeSwapMessage.id,

      }, option.label);

      return;

    }



    await postSwapChat({

      topic: 'swap',

      swapAction: 'select_meal',

      swapMealId: option.id,

      swapSelectionMessageId: activeSwapMessage.id,

    }, option.label);

  }



  async function deleteDiaryEntry(entry: NonNullable<DailySummary['entries']>[number]) {

    if (!entry?.id) return;

    Alert.alert(

      'Remover refeição?',

      `Deseja remover ${entry.mealLabel || 'esta refeição'} do diário?`,

      [

        { text: 'Cancelar', style: 'cancel' },

        {

          text: 'Remover',

          style: 'destructive',

          onPress: async () => {

            try {

              const res = await request<{ dailySummary?: DailySummary }>(

                `/food-diary/entries/${entry.id}`,

                { method: 'DELETE' },

              );

              if (res.dailySummary) setDailySummary(res.dailySummary);

            } catch (err) {

              setError((err as Error).message);

            }

          },

        },

      ],

    );

  }



  function cancelMealConfirm() {
    setShowMealModal(false);
    setMealDraft(null);
    setMealConfirmError('');
    mealFreezeUriRef.current = null;
    setMealFreezeUri(null);
    dismissStage();
  }

  function correctMealResult() {
    cancelMealConfirm();
    setDraft('A análise do prato não ficou certa. O que eu comi de verdade foi: ');
  }

  async function confirmMeal(items: MealDiaryItem[]) {
    if (!mealDraft || confirmingMeal) return;

    setConfirmingMeal(true);
    setMealConfirmError('');

    try {
      const body = {
        items: normalizeMealItemsForSave(items),
        mealType: mealDraft.mealType,
        mealLabel: mealDraft.mealLabel,
        imageUrl: mealDraft.imageUrl,
      };

      let res: {
        dailySummary?: DailySummary;
        message?: ChatMessage;
      };

      if (mealDraft.editingEntryId) {
        res = await request(`/food-diary/entries/${mealDraft.editingEntryId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        res = await request('/food-diary/confirm', {
          method: 'POST',
          body: JSON.stringify({
            ...body,
            userMessageId: mealDraft.userMessageId,
            topic: chatTopic,
          }),
        });
      }

      if (res.message) {
        const [assistantMessage] = normalizeMessages([res.message]);
        if (assistantMessage) {
          setMessages((prev) => [...prev, assistantMessage]);
        }
      }

      if (res.dailySummary) setDailySummary(res.dailySummary);
      cancelMealConfirm();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      setMealConfirmError(
        (err as Error).message
          || (mealDraft.editingEntryId
            ? 'Não foi possível atualizar a refeição.'
            : 'Não foi possível registrar a refeição.'),
      );
    } finally {
      setConfirmingMeal(false);
    }
  }

  async function sendMessage() {

    const text = draft.trim();

    const file = pendingFile;

    if ((!text && !file) || sending) return;



    if (chatTopic === 'swap' && activeSwapMessage && hasActiveSwapMode(activeSwapMessage)) {

      if (!text) return;

      const meta = activeSwapMessage.metadata || {};

      setDraft('');

      await postSwapChat({

        topic: 'swap',

        swapAction: 'custom_food',

        message: text,

        swapMealId: String(meta.swapMealId || ''),

        swapFoodKey: String(meta.swapFoodKey || ''),

        swapSelectionMessageId: activeSwapMessage.id,

      }, text);

      return;

    }



    if (swapSelectionLocked) return;



    setSending(true);

    setTypingVisible(true);

    setError('');

    setDraft('');



    const isPdf = file?.mimeType === 'application/pdf';

    const fallbackText = isPdf

      ? 'Analise este PDF, por favor.'

      : chatTopic === 'meal'

        ? `Analise meu ${(selectedMeal?.label || 'prato').toLowerCase()} para registrar no diário de hoje.`

        : chatTopic === 'label'

          ? 'Analise este rótulo e classifique o consumo (Verde, Amarelo ou Vermelho).'

          : chatTopic === 'receipt'

            ? 'Extraia os alimentos deste cupom e vincule à base de alimentos.'

            : 'Analise esta imagem, por favor.';



    const tempId = `temp-${Date.now()}`;

    const outgoingText = text || (file ? fallbackText : '');



    setMessages((prev) => [...prev, {

      id: tempId,

      role: 'user',

      content: outgoingText,

      metadata: file

        ? {

            taskType: isPdf ? 'pdf' : 'image',

            attachment: {

              type: isPdf ? 'pdf' : 'image',

              fileName: file.name,

              url: isPdf ? undefined : file.uri,

            },

          }

        : null,

    }]);



    clearAttachment();



    try {

      let res: Record<string, unknown>;

      if (file) {

        const form = new FormData();

        if (text) form.append('message', text);

        form.append('topic', chatTopic);

        if (topicConfig.taskHint) form.append('taskHint', topicConfig.taskHint);

        if (chatTopic === 'meal' && selectedMeal) {

          form.append('mealType', selectedMeal.id);

          form.append('mealLabel', selectedMeal.label);

        }

        form.append('file', {

          uri: file.uri,

          name: file.name,

          type: file.mimeType,

        } as unknown as Blob);

        res = await fetchBellaChat({ method: 'POST', body: form });

      } else {

        const form = new FormData();

        form.append('message', text);

        form.append('topic', chatTopic);

        if (topicConfig.taskHint) form.append('taskHint', topicConfig.taskHint);

        if (chatTopic === 'meal' && selectedMeal) {

          form.append('mealType', selectedMeal.id);

          form.append('mealLabel', selectedMeal.label);

        }

        res = await fetchBellaChat({ method: 'POST', body: form });

      }



      setMessages((prev) => {

        const index = prev.findIndex((m) => m.id === tempId);

        if (index < 0) return prev;

        const next = [...prev];

        if (res.userMessage) {

          next[index] = normalizeMessages([res.userMessage as ChatMessage])[0];

        }

        return next;

      });



      applyChatResponse(res);

      if (chatTopic === 'meal') await loadDailySummary();

    } catch (err) {

      setMessages((prev) => prev.filter((m) => m.id !== tempId));

      setDraft(text);

      if (file) {

        setPendingFile(file);

        setAttachmentPreview({

          kind: isPdf ? 'pdf' : 'image',

          name: file.name,

          uri: isPdf ? '' : file.uri,

        });

      }

      setError((err as Error).message);

    } finally {

      setTypingVisible(false);

      setSending(false);

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    }

  }



  return (

    <PatientShell withTabClearance={false}>

      <PatientHeader />

      {chatTopic === 'meal' && dailySummary ? (

        <View style={styles.diaryBarWrap}>

          <BellaDailyDiaryBar

            summary={dailySummary}

            manageable

            onDeleteEntry={deleteDiaryEntry}

          />

        </View>

      ) : null}



      <KeyboardAvoidingView

        style={styles.flex}

        behavior={Platform.OS === 'ios' ? 'padding' : undefined}

        keyboardVerticalOffset={80}

      >

        <PatientScrollView

          ref={scrollRef}

          contentContainerStyle={styles.messages}

          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}

        >

          {loadingMessages ? (
            <View style={styles.messagesLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.messagesLoaderText}>Carregando conversa...</Text>
            </View>
          ) : null}

          {!loadingMessages && historyMessages.length > 0 && chatTopic !== 'swap' ? (

              <Pressable

                style={styles.historyBtn}

                onPress={() => setShowPreviousHistory((v) => !v)}

              >

                <Text style={styles.historyBtnText}>

                  {showPreviousHistory ? 'Ocultar conversas anteriores' : 'Ver conversas anteriores'}

                </Text>

              </Pressable>

            ) : null}



            {!loadingMessages ? displayMessages.map((msg) => {

              const imageUrl = getUserMessageImage(msg);

              const swapOptions = chatTopic === 'swap' && msg.role === 'assistant'

                && activeSwapMessage?.id === msg.id

                ? getSwapOptions(msg)

                : [];

              const showRestart = chatTopic === 'swap'

                && msg.role === 'assistant'

                && !activeSwapMessage

                && isCompletedSwapMessage(msg)

                && findLatestCompletedSwapMessage(threadMessages)?.id === msg.id;



              return (

                <View

                  key={msg.id}

                  style={[

                    styles.bubbleWrap,

                    msg.role === 'user' ? styles.bubbleWrapUser : styles.bubbleWrapBot,

                  ]}

                >

                  {msg.role === 'assistant' ? (

                    <Image source={patientAssets.bellaAvatar} style={styles.botAvatar} />

                  ) : null}



                  {msg.role === 'user' && imageUrl ? (

                    <Image source={{ uri: imageUrl }} style={styles.userThumb} resizeMode="cover" />

                  ) : null}



                  {(msg.role === 'assistant' || msg.content.trim() || !imageUrl) ? (

                    <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>

                      <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}>

                        {stripMarkdown(msg.content)}

                      </Text>



                      {swapOptions.length ? (

                        <View style={styles.swapActions}>

                          {swapOptions.map((option) => (

                            <Pressable

                              key={option.id}

                              style={styles.swapBtn}

                              disabled={sending}

                              onPress={() => handleSwapSelection(option)}

                            >

                              <Text style={styles.swapBtnText}>{option.label}</Text>

                            </Pressable>

                          ))}

                        </View>

                      ) : null}



                      {showRestart ? (

                        <Pressable style={styles.swapBtn} disabled={sending} onPress={() => ensureSwapFlowStarted()}>

                          <RefreshCw size={14} color={colors.primaryDark} />

                          <Text style={styles.swapBtnText}>Nova substituição</Text>

                        </Pressable>

                      ) : null}

                    </View>

                  ) : null}

                </View>

              );

            }) : null}



            {typingVisible ? (

              <View style={[styles.bubbleWrap, styles.bubbleWrapBot]}>

                <Image source={patientAssets.bellaAvatar} style={styles.botAvatar} />

                <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>

                  <Text style={styles.typingText}>Bella está digitando...</Text>

                </View>

              </View>

            ) : null}



            {error ? (

              <View style={styles.errorBanner}>

                <Text style={styles.errorText}>{error}</Text>

                <Pressable onPress={() => { void loadMessages(); }}>

                  <Text style={styles.errorRetry}>Tentar novamente</Text>

                </Pressable>

              </View>

            ) : null}

          </PatientScrollView>



        <View style={styles.composer}>

          {chatTopic === 'meal' && mealOptions.length ? (

            <PatientScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mealRow}>

              <Text style={styles.mealLabel}>Refeição</Text>

              {mealOptions.map((meal) => (

                <Pressable

                  key={meal.id}

                  style={[styles.mealChip, selectedMealId === meal.id && styles.mealChipActive]}

                  onPress={() => setSelectedMealId(meal.id)}

                >

                  <Text style={[styles.mealChipText, selectedMealId === meal.id && styles.mealChipTextActive]}>

                    {meal.label}

                  </Text>

                </Pressable>

              ))}

            </PatientScrollView>

          ) : null}



          {attachmentPreview ? (

            <View style={styles.attachPreview}>

              {attachmentPreview.kind === 'image' ? (

                <Image source={{ uri: attachmentPreview.uri }} style={styles.attachImage} />

              ) : (

                <View style={styles.attachPdf}>

                  <FileText size={18} color={colors.primary} />

                  <Text style={styles.attachPdfText} numberOfLines={1}>{attachmentPreview.name}</Text>

                </View>

              )}

              <Pressable style={styles.attachRemove} onPress={clearAttachment}>

                <X size={14} color="#fff" />

              </Pressable>

            </View>

          ) : null}



          <View style={styles.inputRow}>

            {(topicConfig.acceptImages || topicConfig.acceptPdf) ? (

              <View style={styles.tools}>

                {topicConfig.acceptImages ? (

                  <Pressable style={styles.toolBtn} disabled={sending} onPress={() => requestChatPhoto(true)}>

                    <Camera size={20} color={colors.textMuted} />

                  </Pressable>

                ) : null}

                {topicConfig.acceptImages ? (

                  <Pressable style={styles.toolBtn} disabled={sending} onPress={() => requestChatPhoto(false)}>

                    <ImagePlus size={20} color={colors.textMuted} />

                  </Pressable>

                ) : null}

                {topicConfig.acceptPdf ? (

                  <Pressable style={styles.toolBtn} disabled={sending} onPress={pickDocument}>

                    <FileText size={20} color={colors.textMuted} />

                  </Pressable>

                ) : null}

              </View>

            ) : null}



            <TextInput

              style={styles.input}

              value={draft}

              onChangeText={setDraft}

              placeholder={composerPlaceholder}

              placeholderTextColor={colors.placeholder}

              multiline

              editable={!sending && !swapSelectionLocked}

            />

            <Pressable

              style={[styles.sendBtn, (!canSend || sending) && styles.sendBtnDisabled]}

              onPress={sendMessage}

              disabled={!canSend || sending}

            >

              <ArrowUp color="#fff" size={18} />

            </Pressable>

          </View>

        </View>

      </KeyboardAvoidingView>

      <MealPhotoCaptureOverlays
        tipsOpen={tipsOpen}
        stageOpen={stageOpen}
        analyzing={sending && Boolean(mealFreezeUri) && !mealDraft}
        freezeUri={mealFreezeUri}
        draft={mealFreezeUri ? mealDraft : null}
        saving={confirmingMeal}
        error={mealConfirmError}
        onDismissTips={dismissTips}
        onConfirmTips={confirmTips}
        onDismissStage={dismissStage}
        onShutter={() => captureFromStage(true)}
        onGallery={() => captureFromStage(false)}
        onInfo={reopenTips}
        onCaptured={onStageCaptured}
        onConfirmMeal={confirmMeal}
        onCancelResult={cancelMealConfirm}
        onCorrectResult={correctMealResult}
      />
      <BellaMealConfirmModal
        open={showMealModal && !mealFreezeUri}
        draft={showMealModal && !mealFreezeUri ? mealDraft : null}
        saving={confirmingMeal}
        error={mealConfirmError}
        onCancel={cancelMealConfirm}
        onConfirm={confirmMeal}
        onCorrect={correctMealResult}
      />
    </PatientShell>

  );

}



const styles = StyleSheet.create({

  flex: { flex: 1 },


  diaryBarWrap: { paddingHorizontal: spacing[4], paddingTop: spacing[2] },

  messages: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[6] },

  messagesLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[8],
  },

  messagesLoaderText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },

  historyBtn: {

    alignSelf: 'center',

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: radii.pill,

    paddingHorizontal: spacing[3],

    paddingVertical: spacing[2],

    backgroundColor: colors.surface,

  },

  historyBtnText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },

  bubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2], maxWidth: '92%' },

  bubbleWrapUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },

  bubbleWrapBot: { alignSelf: 'flex-start' },

  botAvatar: { width: 32, height: 32, borderRadius: 16 },

  userThumb: {

    width: 120,

    height: 90,

    borderRadius: radii.control,

    borderWidth: 2,

    borderColor: '#dbbfc1',

    borderStyle: 'dashed',

    marginBottom: spacing[1],

  },

  bubble: {

    maxWidth: '100%',

    borderRadius: radii.control,

    paddingHorizontal: spacing[4],

    paddingVertical: spacing[3],

  },

  bubbleUser: { backgroundColor: '#fdf2f3', borderWidth: 1, borderColor: '#edcfd1' },

  bubbleBot: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },

  bubbleText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.text },

  bubbleTextUser: { color: colors.text },

  typingBubble: { minWidth: 120 },

  typingText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },

  swapActions: { marginTop: spacing[2], gap: spacing[2] },

  swapBtn: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 6,

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: radii.pill,

    paddingHorizontal: spacing[3],

    paddingVertical: spacing[2],

    backgroundColor: colors.primarySoft,

  },

  swapBtnText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primaryDark },

  errorBanner: {

    flexDirection: 'row',

    alignItems: 'flex-start',

    justifyContent: 'space-between',

    gap: spacing[2],

    padding: spacing[3],

    borderRadius: radii.control,

    backgroundColor: '#fff5f5',

    borderWidth: 1,

    borderColor: '#f5c2c2',

  },

  errorText: { flex: 1, color: '#b42318', fontFamily: fonts.regular, fontSize: 12 },

  errorRetry: { color: '#b42318', fontFamily: fonts.bold, fontSize: 12, textDecorationLine: 'underline' },

  composer: {

    padding: spacing[3],

    borderTopWidth: 1,

    borderTopColor: colors.border,

    backgroundColor: colors.surface,

    gap: spacing[2],

  },

  mealRow: { alignItems: 'center', gap: spacing[2], paddingBottom: spacing[1] },

  mealLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted, marginRight: spacing[1] },

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

  attachPreview: { position: 'relative', alignSelf: 'flex-start' },

  attachImage: { width: 72, height: 72, borderRadius: 12 },

  attachPdf: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing[2],

    padding: spacing[2],

    borderRadius: radii.control,

    borderWidth: 1,

    borderColor: colors.border,

    maxWidth: 220,

  },

  attachPdfText: { flex: 1, fontFamily: fonts.medium, fontSize: 12 },

  attachRemove: {

    position: 'absolute',

    top: 4,

    right: 4,

    width: 22,

    height: 22,

    borderRadius: 11,

    backgroundColor: 'rgba(15,23,42,0.68)',

    alignItems: 'center',

    justifyContent: 'center',

  },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2] },

  tools: { flexDirection: 'row', gap: 2 },

  toolBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  input: {

    flex: 1,

    minHeight: 44,

    maxHeight: 120,

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: radii.pill,

    paddingHorizontal: spacing[3],

    paddingVertical: spacing[2],

    fontFamily: fonts.regular,

    fontSize: 15,

    backgroundColor: '#fff',

  },

  sendBtn: {

    width: 44,

    height: 44,

    borderRadius: 22,

    backgroundColor: colors.primary,

    alignItems: 'center',

    justifyContent: 'center',

  },

  sendBtnDisabled: { opacity: 0.45 },

});

