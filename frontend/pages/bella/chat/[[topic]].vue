<template>
  <div class="bella-chat-page">
    <PatientHeader
      :title="topicConfig.title"
      :subtitle="topicConfig.subtitle"
      show-back
      back-to="/bella"
      :show-bell="false"
    />

    <BellaDailyDiaryBar v-if="chatTopic === 'meal' && dailySummary" :summary="dailySummary" />

    <div ref="messagesEl" class="bella-messages">
      <div v-if="loadingMessages" class="bella-loading" aria-live="polite">
        <div class="bella-loading-dots" aria-hidden="true">
          <span /><span /><span />
        </div>
        <p>Carregando conversa...</p>
      </div>

      <template v-else>
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="bella-bubble-wrap"
          :class="msg.role === 'user' ? 'bella-bubble-wrap--user' : 'bella-bubble-wrap--bot'"
        >
          <div v-if="msg.role === 'assistant'" class="bella-bot-avatar" aria-hidden="true">
            <img src="/falecomabella.webp" alt="" width="32" height="32" />
          </div>
          <div
            class="bella-bubble"
            :class="[
              msg.role === 'user' ? 'bella-bubble--user' : 'bella-bubble--bot',
              msg.role === 'user' && userMessageImage(msg) ? 'bella-bubble--user-media' : '',
            ]"
          >
            <template v-if="msg.role === 'user'">
              <div
                class="bella-user-payload"
                :class="{ 'bella-user-payload--media': userMessageImage(msg) }"
              >
                <div
                  v-if="userMessageImage(msg)"
                  class="bella-msg-media cf-squircle cf-squircle--msg-media"
                >
                  <img
                    :src="userMessageImage(msg)"
                    alt="Imagem enviada"
                    class="bella-msg-image"
                    loading="lazy"
                  />
                </div>
                <div v-else-if="messageAttachment(msg)?.type === 'pdf'" class="bella-msg-pdf">
                  <FileText class="bella-msg-pdf-icon" />
                  <span>{{ messageAttachment(msg).fileName }}</span>
                </div>
                <p v-if="shouldShowUserText(msg)" class="bella-msg-caption">{{ messageDisplayText(msg) }}</p>
              </div>
            </template>
            <template v-else>
              <img
                v-if="messageAttachment(msg)?.url && messageAttachment(msg).type === 'image'"
                :src="messageAttachment(msg).url"
                alt="Imagem enviada"
                class="bella-msg-image cf-squircle cf-squircle--attach"
                loading="lazy"
              />
              <div v-else-if="messageAttachment(msg)?.type === 'pdf'" class="bella-msg-pdf">
                <FileText class="bella-msg-pdf-icon" />
                <span>{{ messageAttachment(msg).fileName }}</span>
              </div>
              <div
                class="bella-msg-formatted"
                v-html="formatMessageContent(msg.content)"
              />
            </template>
          </div>
        </div>

      </template>

      <div v-if="sending" class="bella-bubble-wrap bella-bubble-wrap--bot">
        <div class="bella-bot-avatar" aria-hidden="true">
          <img src="/falecomabella.webp" alt="" width="32" height="32" />
        </div>
        <div class="bella-bubble bella-bubble--bot bella-bubble--typing">
          <span /><span /><span />
        </div>
      </div>
    </div>

    <div class="bella-composer">
      <div v-if="chatError" class="bella-error-banner" role="alert">
        <p>{{ chatError }}</p>
        <button type="button" class="bella-error-retry" @click="retryLoad">Tentar novamente</button>
      </div>

      <form class="bella-input-bar" @submit.prevent="sendMessage">
        <input
          ref="cameraInputEl"
          type="file"
          accept="image/*"
          capture="environment"
          class="bella-file-input"
          @change="onFileSelected"
        />
        <input
          ref="fileInputEl"
          type="file"
          :accept="fileAccept"
          class="bella-file-input"
          @change="onFileSelected"
        />

        <div class="bella-composer-shell cf-squircle cf-squircle--composer">
          <div v-if="attachmentPreview" class="bella-composer-attach">
            <div v-if="attachmentPreview.kind === 'image'" class="bella-attach-chips">
              <div class="bella-attach-chip cf-squircle cf-squircle--attach">
                <img :src="attachmentPreview.url" alt="Imagem anexada" />
                <button
                  type="button"
                  class="bella-attach-remove-overlay"
                  aria-label="Remover imagem"
                  @click="clearAttachment"
                >
                  <X class="remove-icon" />
                </button>
              </div>
            </div>

            <div v-else class="bella-attach-file cf-list-row">
              <div class="cf-list-thumb cf-squircle cf-squircle--icon">
                <FileText class="pdf-icon" />
              </div>
              <div class="cf-list-copy">
                <p class="cf-list-title">{{ attachmentPreview.name }}</p>
                <p class="cf-list-meta">Pronto para enviar</p>
              </div>
              <button type="button" class="bella-remove-attach" aria-label="Remover anexo" @click="clearAttachment">
                <X class="remove-icon" />
              </button>
            </div>
          </div>

          <div class="bella-input-row">
            <div v-if="showCameraButton || showGalleryButton" class="bella-input-tools">
              <button
                v-if="showCameraButton"
                type="button"
                class="bella-tool-btn"
                :disabled="sending"
                aria-label="Tirar foto agora"
                @click="openCamera"
              >
                <Camera class="attach-icon" />
              </button>
              <button
                v-if="showGalleryButton"
                type="button"
                class="bella-tool-btn"
                :disabled="sending"
                aria-label="Escolher da galeria"
                @click="openFilePicker"
              >
                <ImagePlus class="attach-icon" />
              </button>
            </div>
            <input
              v-model="draft"
              type="text"
              :placeholder="topicConfig.placeholder"
              :disabled="sending"
              maxlength="4000"
              autocomplete="off"
            />
            <button type="submit" class="bella-send-btn" :disabled="!canSend || sending" aria-label="Enviar mensagem">
              <Send class="send-icon" />
            </button>
          </div>
        </div>
      </form>

      <p v-if="!chatError && !aiEnabled" class="bella-ai-hint">
        IA offline no servidor. As respostas podem ser limitadas até o backend ser reiniciado.
      </p>
    </div>

    <BellaMealConfirmModal
      :open="showMealModal"
      :draft="mealDraft"
      :daily-summary="dailySummary"
      :saving="confirmingMeal"
      :error="mealConfirmError"
      @cancel="cancelMealConfirm"
      @confirm="confirmMeal"
    />
  </div>
</template>

<script setup>
import { Camera, FileText, ImagePlus, Send, X } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { getBellaTopicConfig, normalizeBellaTopic } from '~/config/bella-topics'
import {
  formatBellaMarkdown,
  getMessageAttachment,
  getMessageDisplayText,
  getUserMessageImageUrl,
  shouldShowUserMessageText,
} from '~/utils/bella-message-format'
import { normalizeMealItemsForSave } from '~/utils/meal-diary'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const route = useRoute()
const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const { userName } = usePatientApp()

const chatTopic = computed(() => {
  const raw = route.params.topic
  return normalizeBellaTopic(Array.isArray(raw) ? raw[0] : raw)
})
const topicConfig = computed(() => getBellaTopicConfig(chatTopic.value))

const messages = ref([])
const draft = ref('')
const sending = ref(false)
const loadingMessages = ref(false)
const chatError = ref('')
const aiEnabled = ref(true)
const messagesEl = ref(null)
const fileInputEl = ref(null)
const cameraInputEl = ref(null)
const taskHint = ref('')
const selectedFile = ref(null)
const attachmentPreview = ref(null)
const pendingCameraOpen = ref(false)
const dailySummary = ref(null)
const showMealModal = ref(false)
const mealDraft = ref(null)
const confirmingMeal = ref(false)
const mealConfirmError = ref('')

const { patientTimeHeaders } = usePatientLocalTime()

const showCameraButton = computed(() => topicConfig.value.acceptImages)
const showGalleryButton = computed(() => topicConfig.value.acceptImages || topicConfig.value.acceptPdf)

const fileAccept = computed(() => {
  const parts = []
  if (topicConfig.value.acceptImages) {
    parts.push('image/jpeg', 'image/png', 'image/webp', 'image/gif', '.jpg', '.jpeg', '.png', '.webp', '.gif')
  }
  if (topicConfig.value.acceptPdf) {
    parts.push('application/pdf', '.pdf')
  }
  return parts.join(',')
})

const canSend = computed(() => Boolean(draft.value.trim() || selectedFile.value))

function formatChatError(err) {
  const raw = err?.data?.message || err?.message || ''
  if (raw.includes('Failed to fetch') || raw.includes('<no response>') || raw.includes('NetworkError')) {
    return 'Não consegui conectar ao servidor. Confira se o backend está rodando na porta 3001.'
  }
  if (err?.statusCode === 401 || err?.status === 401) {
    return 'Sua sessão expirou. Faça login novamente para continuar.'
  }
  return raw || 'Não foi possível carregar a conversa com a Bella.'
}

function seedWelcomeMessage() {
  const welcomeId = `welcome-${chatTopic.value}`
  if (messages.value.some((m) => m.id === welcomeId)) return
  messages.value.push({
    id: welcomeId,
    role: 'assistant',
    content: getWelcomeContent(),
  })
}

const messageAttachment = (msg) => getMessageAttachment(msg)
const messageDisplayText = (msg) => getMessageDisplayText(msg)
const userMessageImage = (msg) => getUserMessageImageUrl(msg)
const shouldShowUserText = (msg) => shouldShowUserMessageText(msg)
const formatMessageContent = (content) => formatBellaMarkdown(content)

function revokeBlobUrl(url) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

function clearComposerFields() {
  selectedFile.value = null
  attachmentPreview.value = null
  if (fileInputEl.value) fileInputEl.value.value = ''
  if (cameraInputEl.value) cameraInputEl.value.value = ''
  taskHint.value = topicConfig.value.taskHint || ''
}

function patchUserMessageAttachment(msg, fallbackUrl) {
  if (!msg || !fallbackUrl) return msg
  const attachment = getMessageAttachment(msg)
  if (attachment?.url?.startsWith('http')) return msg
  if (attachment?.type !== 'image') return msg

  return {
    ...msg,
    metadata: {
      ...(msg.metadata || {}),
      attachment: {
        ...(msg.metadata?.attachment || {}),
        type: 'image',
        url: fallbackUrl,
      },
    },
  }
}

function getWelcomeContent() {
  const fromDieta = route.query.from === 'dieta'
  const mealLabel = typeof route.query.label === 'string' ? route.query.label.trim() : ''
  if (chatTopic.value === 'meal' && fromDieta && mealLabel) {
    return `Olá, ${userName()}! 📸 Envie a foto do seu ${mealLabel.toLowerCase()}. Estimo gramas, calorias e macros de cada item do prato.`
  }
  return topicConfig.value.welcome(userName())
}

function applyRouteContext() {
  if (route.query.from !== 'dieta' || chatTopic.value !== 'meal') return
  const label = typeof route.query.label === 'string' ? route.query.label.trim() : ''
  if (label) {
    draft.value = `Analise meu ${label.toLowerCase()}`
  }
  if (route.query.camera === '1') {
    pendingCameraOpen.value = true
  }
}

const scrollToBottom = async () => {
  await nextTick()
  const el = messagesEl.value
  if (el) el.scrollTop = el.scrollHeight
}

const loadMessages = async () => {
  chatError.value = ''
  loadingMessages.value = true
  try {
    const data = await $fetch(`${apiBase}/bella/messages`, {
      headers: patientTimeHeaders(),
      query: { topic: chatTopic.value },
    })
    messages.value = data.messages || []
    aiEnabled.value = data.aiEnabled !== false
    if (data.dailySummary) dailySummary.value = data.dailySummary
    if (!messages.value.length) seedWelcomeMessage()
    await scrollToBottom()
  } finally {
    loadingMessages.value = false
  }
}

const retryLoad = async () => {
  try {
    await loadMessages()
    await loadDailySummary()
  } catch (err) {
    seedWelcomeMessage()
    chatError.value = formatChatError(err)
  }
}

const openFilePicker = () => {
  fileInputEl.value?.click()
}

const openCamera = () => {
  cameraInputEl.value?.click()
}

const clearAttachment = () => {
  revokeBlobUrl(attachmentPreview.value?.url)
  clearComposerFields()
}

const resetComposer = () => {
  revokeBlobUrl(attachmentPreview.value?.url)
  clearComposerFields()
  draft.value = ''
}

const onFileSelected = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  chatError.value = ''

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  const isImage = file.type.startsWith('image/')

  if (isPdf && !topicConfig.value.acceptPdf) {
    chatError.value = 'Neste chat só é possível enviar imagens.'
    if (fileInputEl.value) fileInputEl.value.value = ''
    if (cameraInputEl.value) cameraInputEl.value.value = ''
    return
  }

  if (isImage && !topicConfig.value.acceptImages) {
    chatError.value = 'Neste chat não é possível enviar imagens.'
    if (fileInputEl.value) fileInputEl.value.value = ''
    if (cameraInputEl.value) cameraInputEl.value.value = ''
    return
  }

  if (!isPdf && !isImage) {
    chatError.value = 'Envie uma imagem (JPG, PNG, WEBP) ou PDF.'
    return
  }

  if (file.size > 12 * 1024 * 1024) {
    chatError.value = 'Arquivo muito grande. O limite é 12 MB.'
    return
  }

  if (attachmentPreview.value?.url) revokeBlobUrl(attachmentPreview.value.url)

  selectedFile.value = file
  taskHint.value = isPdf ? 'pdf' : topicConfig.value.taskHint || 'image'
  attachmentPreview.value = {
    kind: isPdf ? 'pdf' : 'image',
    name: file.name,
    url: isPdf ? null : URL.createObjectURL(file),
  }
}

const loadDailySummary = async () => {
  if (chatTopic.value !== 'meal') return
  try {
    dailySummary.value = await $fetch(`${apiBase}/food-diary/today`, { headers: patientTimeHeaders() })
  } catch {
    /* ignore */
  }
}

const cancelMealConfirm = () => {
  showMealModal.value = false
  mealDraft.value = null
  mealConfirmError.value = ''
}

const confirmMeal = async (items) => {
  if (!mealDraft.value || confirmingMeal.value) return
  confirmingMeal.value = true
  mealConfirmError.value = ''

  try {
    const res = await $fetch(`${apiBase}/food-diary/confirm`, {
      method: 'POST',
      headers: patientTimeHeaders(),
      body: {
        items: normalizeMealItemsForSave(items),
        mealType: mealDraft.value.mealType,
        mealLabel: mealDraft.value.mealLabel,
        imageUrl: mealDraft.value.imageUrl,
        userMessageId: mealDraft.value.userMessageId,
        topic: chatTopic.value,
      },
    })

    if (res.message) messages.value.push(res.message)
    if (res.dailySummary) dailySummary.value = res.dailySummary
    cancelMealConfirm()
    await scrollToBottom()
  } catch (err) {
    mealConfirmError.value = err.data?.message || 'Não foi possível registrar a refeição.'
  } finally {
    confirmingMeal.value = false
  }
}

const sendMessage = async () => {
  const text = draft.value.trim()
  const file = selectedFile.value
  if ((!text && !file) || sending.value) return

  chatError.value = ''
  sending.value = true
  draft.value = ''
  const hint = taskHint.value || undefined
  const isPdf = file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
  const fallbackText = isPdf
    ? 'Analise este PDF, por favor.'
    : chatTopic.value === 'meal'
      ? 'Analise meu prato, por favor.'
      : chatTopic.value === 'label'
        ? 'Analise este rótulo, por favor.'
        : 'Analise esta imagem, por favor.'

  const tempId = `temp-${Date.now()}`
  const localPreviewUrl = file && !isPdf ? attachmentPreview.value?.url : null
  const outgoingFile = file

  messages.value.push({
    id: tempId,
    role: 'user',
    content: text || (file ? fallbackText : ''),
    metadata: file
      ? {
          taskType: hint || (isPdf ? 'pdf' : 'image'),
          attachment: {
            type: isPdf ? 'pdf' : 'image',
            fileName: file.name,
            url: localPreviewUrl,
          },
        }
      : null,
  })

  clearComposerFields()
  await scrollToBottom()

  try {
    let res
    if (outgoingFile) {
      const form = new FormData()
      if (text) form.append('message', text)
      form.append('topic', chatTopic.value)
      if (hint) form.append('taskHint', hint)
      if (route.query.meal) form.append('mealType', String(route.query.meal))
      if (route.query.label) form.append('mealLabel', String(route.query.label))
      form.append('file', outgoingFile)

      res = await $fetch(`${apiBase}/bella/chat`, {
        method: 'POST',
        headers: patientTimeHeaders(),
        body: form,
      })
    } else {
      res = await $fetch(`${apiBase}/bella/chat`, {
        method: 'POST',
        headers: patientTimeHeaders(),
        body: { message: text, topic: chatTopic.value, taskHint: hint },
      })
    }

    const tempIndex = messages.value.findIndex((m) => m.id === tempId)
    if (tempIndex >= 0 && res.userMessage) {
      messages.value[tempIndex] = patchUserMessageAttachment(res.userMessage, localPreviewUrl)
    }

    const savedUrl = tempIndex >= 0 ? getUserMessageImageUrl(messages.value[tempIndex]) : null
    if (localPreviewUrl && savedUrl?.startsWith('http')) {
      revokeBlobUrl(localPreviewUrl)
    }

    if (res.requiresMealConfirmation && res.mealDraft) {
      mealDraft.value = res.mealDraft
      if (res.dailySummary) dailySummary.value = res.dailySummary
      showMealModal.value = true
      mealConfirmError.value = ''
    } else if (res.message) {
      messages.value.push(res.message)
    }
  } catch (err) {
    chatError.value = formatChatError(err)
    messages.value = messages.value.filter((m) => m.id !== tempId)
    revokeBlobUrl(localPreviewUrl)
    draft.value = text
    if (outgoingFile && !isPdf) {
      selectedFile.value = outgoingFile
      attachmentPreview.value = {
        kind: 'image',
        name: outgoingFile.name,
        url: URL.createObjectURL(outgoingFile),
      }
    }
  } finally {
    sending.value = false
    await scrollToBottom()
  }
}

async function bootstrapChat() {
  resetComposer()
  applyRouteContext()
  messages.value = []
  chatError.value = ''

  if (!import.meta.client) return

  const token = localStorage.getItem('auth_token')
  if (!token) {
    chatError.value = 'Faça login para conversar com a Bella.'
    seedWelcomeMessage()
    return
  }

  try {
    await loadMessages()
    await loadDailySummary()
    if (pendingCameraOpen.value && topicConfig.value.acceptImages) {
      pendingCameraOpen.value = false
      await nextTick()
      openCamera()
    }
  } catch (err) {
    seedWelcomeMessage()
    chatError.value = formatChatError(err)
  }
}

watch(chatTopic, () => {
  bootstrapChat()
})

onMounted(() => {
  bootstrapChat()
})

onBeforeUnmount(() => {
  revokeBlobUrl(attachmentPreview.value?.url)
})
</script>

<style scoped>
.bella-chat-page {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - var(--cf-tab-h) - env(safe-area-inset-top, 0px));
  max-width: 430px;
  margin: 0 auto;
  background: var(--cf-bg);
  overflow: hidden;
}

.bella-chat-page :deep(.diary-bar) {
  margin: 0.5rem 1.25rem 0;
  flex-shrink: 0;
}

.bella-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  padding: 0.85rem 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bella-loading {
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
  padding: 2rem 1rem;
  color: var(--cf-text-muted);
  font-size: 0.85rem;
}

.bella-loading-dots {
  display: flex;
  gap: 0.35rem;
}

.bella-loading-dots span {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: var(--cf-radius-full);
  background: var(--cf-pink);
  opacity: 0.35;
  animation: bella-pulse 1.2s infinite;
}

.bella-loading-dots span:nth-child(2) { animation-delay: 0.15s; }
.bella-loading-dots span:nth-child(3) { animation-delay: 0.3s; }

@keyframes bella-pulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.92); }
  40% { opacity: 1; transform: scale(1); }
}

.bella-bubble-wrap {
  display: flex;
  align-items: flex-end;
  gap: 0.45rem;
  max-width: 90%;
}

.bella-bubble-wrap--user {
  align-self: flex-end;
  flex-direction: row-reverse;
  max-width: min(88%, 18.5rem);
}

.bella-bubble-wrap--user:has(.bella-bubble--user-media) {
  max-width: min(92%, 19.5rem);
}

.bella-bubble-wrap--bot {
  max-width: 94%;
}

.bella-bot-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: var(--cf-radius-full);
  background: var(--cf-pink-soft);
  border: 1px solid #f0d8da;
  overflow: hidden;
  flex-shrink: 0;
}

.bella-bot-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
}

.bella-bubble {
  padding: 0.75rem 0.9rem;
  border-radius: var(--cf-radius-xl);
  line-height: 1.5;
  font-size: 0.9rem;
  min-width: 0;
  word-break: break-word;
}

.bella-bubble--user-media {
  padding: 0.5rem;
  border-radius: var(--cf-radius-msg-bubble, 1.625rem);
  max-width: 100%;
  overflow: hidden;
}

.bella-user-payload {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.bella-user-payload--media {
  gap: 0;
}

.bella-msg-media {
  overflow: hidden;
  line-height: 0;
  width: 100%;
  background: rgba(255, 255, 255, 0.14);
}

.bella-msg-image {
  display: block;
  width: 100%;
  max-width: 100%;
  max-height: 17.5rem;
  height: auto;
  object-fit: contain;
  object-position: center;
}

.bella-msg-caption {
  margin: 0;
  padding: 0.45rem 0.5rem 0.2rem;
  font-size: 0.9375rem;
  font-weight: 400;
  line-height: 1.4;
  color: #fff;
  text-align: left;
}

.bella-bubble--user-media .bella-msg-pdf {
  margin-bottom: 0;
  padding: 0.15rem 0.35rem 0;
}

.bella-bubble--user .bella-msg-image {
  border: none;
}

.bella-bubble--bot .bella-msg-image {
  max-width: 220px;
  margin-bottom: 0.5rem;
}

.bella-msg-pdf {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.45rem;
  font-size: 0.82rem;
  font-weight: 500;
}

.bella-msg-pdf-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.bella-msg-plain {
  margin: 0;
}

.bella-msg-formatted :deep(h3.bella-md-h) {
  margin: 0 0 0.45rem;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: inherit;
}

.bella-msg-formatted :deep(h3.bella-md-h:not(:first-child)) {
  margin-top: 0.85rem;
}

.bella-msg-formatted :deep(h4.bella-md-sub) {
  margin: 0.65rem 0 0.35rem;
  font-size: 0.84rem;
  font-weight: 600;
}

.bella-msg-formatted :deep(p) {
  margin: 0 0 0.55rem;
}

.bella-msg-formatted :deep(p:last-child) {
  margin-bottom: 0;
}

.bella-msg-formatted :deep(ul),
.bella-msg-formatted :deep(ol) {
  margin: 0 0 0.65rem;
  padding-left: 1.15rem;
}

.bella-msg-formatted :deep(li) {
  margin-bottom: 0.3rem;
}

.bella-msg-formatted :deep(li:last-child) {
  margin-bottom: 0;
}

.bella-msg-formatted :deep(strong) {
  font-weight: 600;
}

.bella-bubble--user {
  background: var(--cf-pink);
  color: #fff;
  border-bottom-right-radius: 0.375rem;
}

.bella-bubble--user.bella-bubble--user-media {
  border-radius: var(--cf-radius-msg-bubble, 1.625rem);
}

.bella-bubble--bot {
  background: var(--cf-surface);
  border: 1px solid var(--cf-border);
  border-bottom-left-radius: 6px;
  color: var(--cf-text);
  box-shadow: var(--cf-shadow);
}

.bella-bubble--typing {
  display: flex;
  gap: 4px;
  padding: 0.9rem 1rem;
}

.bella-bubble--typing span {
  width: 6px;
  height: 6px;
  border-radius: var(--cf-radius-full);
  background: var(--cf-pink);
  opacity: 0.45;
  animation: bella-pulse 1.2s infinite;
}

.bella-bubble--typing span:nth-child(2) { animation-delay: 0.15s; }
.bella-bubble--typing span:nth-child(3) { animation-delay: 0.3s; }

.bella-composer {
  flex-shrink: 0;
  background: var(--cf-surface);
  border-top: 1px solid var(--cf-border);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.bella-composer-shell {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--cf-border);
  background: var(--cf-bg);
  box-shadow: var(--cf-shadow);
}

.bella-composer-attach {
  padding: 0.55rem 0.65rem 0.15rem;
}

.bella-attach-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.bella-attach-chip {
  position: relative;
  width: 4.5rem;
  height: 4.5rem;
  flex-shrink: 0;
  line-height: 0;
}

.bella-attach-chip img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bella-attach-remove-overlay {
  position: absolute;
  top: 0.3rem;
  right: 0.3rem;
  width: 1.45rem;
  height: 1.45rem;
  border: none;
  border-radius: var(--cf-radius-full);
  background: rgba(15, 23, 42, 0.68);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bella-attach-remove-overlay .remove-icon {
  width: 0.8rem;
  height: 0.8rem;
}

.bella-attach-file .pdf-icon {
  width: 1.15rem;
  height: 1.15rem;
  color: var(--cf-pink);
}

.bella-attach-file .cf-list-thumb {
  width: 2.5rem;
  height: 2.5rem;
  background: #f3f4f6;
  color: var(--cf-text-muted);
}

.bella-error-banner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0.65rem 1.25rem 0;
  padding: 0.65rem 0.75rem;
  border-radius: var(--cf-radius-xl);
  background: #fff5f5;
  border: 1px solid #f5c2c2;
}

.bella-error-banner p {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.45;
  color: #b42318;
}

.bella-error-retry {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: #b42318;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.bella-remove-attach {
  margin-left: auto;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: var(--cf-radius-full);
  background: transparent;
  color: var(--cf-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bella-remove-attach:active {
  background: var(--cf-track);
}

.remove-icon {
  width: 1rem;
  height: 1rem;
}

.bella-input-bar {
  padding: 0.65rem 1.25rem 0.75rem;
}

.bella-file-input {
  display: none;
}

.bella-input-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.35rem 0.35rem 0.5rem;
}

.bella-input-tools {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  flex-shrink: 0;
}

.bella-tool-btn {
  width: 2.15rem;
  height: 2.15rem;
  border: none;
  border-radius: var(--cf-radius-full);
  background: transparent;
  color: var(--cf-pink-dark);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bella-tool-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.attach-icon {
  width: 1.05rem;
  height: 1.05rem;
}

.bella-input-row input[type='text'] {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  padding: 0.55rem 0.25rem;
  font-size: 0.9rem;
  font-family: inherit;
  color: var(--cf-text);
}

.bella-input-row input[type='text']::placeholder {
  color: var(--cf-text-muted);
}

.bella-input-row input[type='text']:focus {
  outline: none;
}

.bella-send-btn {
  width: 2.35rem;
  height: 2.35rem;
  border: none;
  border-radius: var(--cf-radius-full);
  background: var(--cf-pink);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s ease, transform 0.15s ease;
}

.bella-send-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.bella-send-btn:not(:disabled):active {
  transform: scale(0.96);
  background: var(--cf-pink-dark);
}

.send-icon {
  width: 1rem;
  height: 1rem;
}

.bella-ai-hint {
  margin: 0;
  padding: 0 1.25rem 0.65rem;
  font-size: 0.72rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .bella-loading-dots span,
  .bella-bubble--typing span,
  .bella-send-btn {
    animation: none;
    transition: none;
  }

  .bella-send-btn:not(:disabled):active {
    transform: none;
  }
}
</style>
