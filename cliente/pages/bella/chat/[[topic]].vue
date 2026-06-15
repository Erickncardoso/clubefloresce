<template>
  <div class="bella-chat-page">
    <div class="bella-chat-sticky">
      <PatientHeader
        :title="topicConfig.title"
        :subtitle="topicConfig.subtitle"
        show-back
        back-to="/bella"
        :show-bell="false"
      />

      <BellaDailyDiaryBar
        v-if="chatTopic === 'meal' && dailySummary"
        :summary="dailySummary"
        collapsible
        class="bella-diary-bar"
      />
    </div>

    <div ref="messagesEl" class="bella-messages">
      <PatientPageSkeleton v-if="loadingMessages" layout="chat" />

      <template v-else>
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="bella-bubble-wrap"
          :class="{
            'bella-bubble-wrap--user': msg.role === 'user',
            'bella-bubble-wrap--bot': msg.role === 'assistant',
            'bella-bubble-wrap--user-with-media': msg.role === 'user' && userMessageImage(msg),
          }"
        >
          <div v-if="msg.role === 'assistant'" class="bella-bot-avatar" aria-hidden="true">
            <img src="/falecomabella.webp" alt="" width="32" height="32" />
          </div>

          <div
            v-if="msg.role === 'user' && userMessageImage(msg)"
            class="bella-msg-thumb cf-squircle cf-squircle--msg-media"
          >
            <img
              :src="userMessageImage(msg)"
              alt="Imagem enviada"
              class="bella-msg-image"
              loading="lazy"
            />
          </div>

          <div
            v-if="userMessageShowsBubble(msg)"
            class="bella-bubble"
            :class="msg.role === 'user' ? 'bella-bubble--user' : 'bella-bubble--bot'"
          >
            <template v-if="msg.role === 'user'">
              <div v-if="messageAttachment(msg)?.type === 'pdf'" class="bella-msg-pdf">
                <FileText class="bella-msg-pdf-icon" />
                <span>{{ messageAttachment(msg).fileName }}</span>
              </div>
              <p v-if="shouldShowUserText(msg)" class="bella-msg-plain">{{ messageDisplayText(msg) }}</p>
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
                @click="onMessageContentClick"
                v-html="formatMessageContent(msg.content)"
              />
              <BellaSwapButtons
                v-if="chatTopic === 'swap' && shouldShowSwapButtons(msg)"
                :message="msg"
                :disabled="sending"
                @select="(option) => handleSwapSelection(msg, option)"
                @mode="(action) => handleSwapModeAction(msg, action)"
              />
            </template>
          </div>
        </div>

      <div
        class="bella-typing-anchor"
        :class="{ 'bella-typing-anchor--reserved': sending }"
        :aria-hidden="!typingDotsVisible"
      >
        <div v-if="typingDotsVisible" class="bella-bubble-wrap bella-bubble-wrap--bot">
          <div class="bella-bot-avatar" aria-hidden="true">
            <img src="/falecomabella.webp" alt="" width="32" height="32" />
          </div>
          <div class="bella-bubble bella-bubble--bot bella-bubble--typing" aria-label="Bella está digitando">
            <div class="bella-typing-dots" aria-hidden="true">
              <span /><span /><span />
            </div>
          </div>
        </div>
      </div>
      <div ref="bottomAnchor" class="bella-scroll-anchor" aria-hidden="true" />
      </template>
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
              :placeholder="composerPlaceholder"
              :disabled="sending || swapSelectionLocked"
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
        IA desativada no servidor. No Coolify, adicione <strong>OPENAI_API_KEY</strong> no serviço do
        <strong>backend</strong> (apiclube) e faça redeploy.
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
import { apiConnectionErrorMessage, isApiConnectionError } from '~/utils/resolve-api-base.mjs'
import { getBellaTopicConfig, normalizeBellaTopic } from '~/config/bella-topics'
import {
  formatBellaMarkdown,
  getMessageAttachment,
  getMessageDisplayText,
  getUserMessageImageUrl,
  shouldShowUserMessageText,
} from '~/utils/bella-message-format'
import { normalizeMealItemsForSave } from '~/utils/meal-diary'
import {
  findActiveSwapMessage,
  hasActiveSwapMode,
  hasActiveSwapSelection,
} from '~/utils/bella-swap'

definePageMeta({ layout: 'patient', middleware: 'patient-only', pageTransition: false })

useHead({
  htmlAttrs: { class: 'bella-chat-active' },
  bodyAttrs: { class: 'bella-chat-active' },
})

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
const typingDotsVisible = ref(false)
const loadingMessages = ref(false)
const chatError = ref('')
const aiEnabled = ref(true)
const messagesEl = ref(null)
const bottomAnchor = ref(null)
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
const pinningToBottom = ref(false)

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

const canSend = computed(() => {
  if (swapSelectionLocked.value) return false
  return Boolean(draft.value.trim() || selectedFile.value)
})

const activeSwapMessage = computed(() => (
  chatTopic.value === 'swap' ? findActiveSwapMessage(messages.value) : null
))

const swapSelectionLocked = computed(() => (
  Boolean(activeSwapMessage.value && hasActiveSwapSelection(activeSwapMessage.value))
))

const composerPlaceholder = computed(() => {
  if (swapSelectionLocked.value) return 'Use os botões acima para escolher'
  if (activeSwapMessage.value && hasActiveSwapMode(activeSwapMessage.value)) {
    return 'Digite o alimento que quer incluir...'
  }
  return topicConfig.value.placeholder
})

function isActiveSwapMessage(msg) {
  return Boolean(
    chatTopic.value === 'swap'
    && activeSwapMessage.value
    && msg?.id === activeSwapMessage.value.id,
  )
}

function shouldShowSwapButtons(msg) {
  if (chatTopic.value !== 'swap' || msg?.role !== 'assistant') return false
  return isActiveSwapMessage(msg)
}

function normalizeMessageMetadata(metadata) {
  if (!metadata) return null
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata)
    } catch {
      return null
    }
  }
  return metadata
}

function normalizeLoadedMessages(list) {
  return (list || []).map((msg) => ({
    ...msg,
    metadata: normalizeMessageMetadata(msg.metadata),
  }))
}

function formatChatError(err) {
  const raw = err?.data?.message || err?.message || ''
  if (isApiConnectionError(err)) {
    return apiConnectionErrorMessage({
      dev: import.meta.dev,
      hostname: import.meta.client ? window.location.hostname : undefined,
    })
  }
  if (err?.statusCode === 401 || err?.status === 401) {
    return 'Sua sessão expirou. Faça login novamente para continuar.'
  }
  if (err?.statusCode === 502 || err?.status === 502) {
    return raw || 'A OpenAI retornou erro. Verifique OPENAI_API_KEY e saldo da conta no backend (Coolify).'
  }
  return raw || 'Não foi possível falar com a Bella. Tente novamente.'
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
const userMessageShowsBubble = (msg) => {
  if (msg.role === 'assistant') return true
  if (!userMessageImage(msg)) return true
  return shouldShowUserText(msg) || messageAttachment(msg)?.type === 'pdf'
}
const formatMessageContent = (content) => formatBellaMarkdown(content)

const TYPING_DOTS_DELAY_MS = 2000
const TYPING_DOTS_MIN_MS = 1200

let typingDotsTimer = null
let typingDotsShownAt = 0
let scrollRaf = null
let scrollRetryTimers = []
let messagesResizeObserver = null

function clearScrollRetryTimers() {
  scrollRetryTimers.forEach((id) => clearTimeout(id))
  scrollRetryTimers = []
}

function scheduleScrollRetries() {
  clearScrollRetryTimers()
  for (const delay of [0, 50, 120, 250, 450, 700]) {
    scrollRetryTimers.push(setTimeout(() => scrollToBottom(true), delay))
  }
}

function getMessagesMaxScroll() {
  const el = messagesEl.value
  if (!el) return 0
  return Math.max(0, el.scrollHeight - el.clientHeight)
}

const scrollToBottom = (force = false) => {
  if (!import.meta.client) return
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = null
      const el = messagesEl.value
      if (!el) return
      const maxScroll = getMessagesMaxScroll()
      const shouldForce = force || sending.value || pinningToBottom.value
      if (!shouldForce && el.scrollTop < maxScroll - 96) return
      el.scrollTop = maxScroll
    })
  })
}

async function stickScrollToBottom() {
  pinningToBottom.value = true
  await scrollToBottomAfterLayout()
}

async function scrollToBottomAfterLayout() {
  await nextTick()
  scrollToBottom(true)
  await nextTick()
  scrollToBottom(true)
  scheduleScrollRetries()

  const el = messagesEl.value
  if (!el) return

  const images = el.querySelectorAll('img')
  const pending = [...images].filter((img) => !img.complete)
  if (!pending.length) return

  await Promise.all(
    pending.map(
      (img) =>
        new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true })
          img.addEventListener('error', resolve, { once: true })
        }),
    ),
  )
  scrollToBottom(true)
  scheduleScrollRetries()
}

function startPinningToBottom() {
  pinningToBottom.value = true
  if (!import.meta.client) return
  messagesResizeObserver?.disconnect()
  messagesResizeObserver = new ResizeObserver(() => {
    if (pinningToBottom.value) scrollToBottom(true)
  })
  if (messagesEl.value) messagesResizeObserver.observe(messagesEl.value)
}

function stopPinningToBottom() {
  pinningToBottom.value = false
  messagesResizeObserver?.disconnect()
  messagesResizeObserver = null
  clearScrollRetryTimers()
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clearTypingDotsTimer() {
  if (typingDotsTimer) {
    clearTimeout(typingDotsTimer)
    typingDotsTimer = null
  }
}

function startTypingIndicator() {
  clearTypingDotsTimer()
  typingDotsVisible.value = false
  typingDotsShownAt = 0
  typingDotsTimer = setTimeout(() => {
    typingDotsVisible.value = true
    typingDotsShownAt = Date.now()
    typingDotsTimer = null
    scrollToBottom(true)
  }, TYPING_DOTS_DELAY_MS)
}

async function finishTypingIndicator() {
  clearTypingDotsTimer()

  if (!typingDotsVisible.value) return

  const visibleFor = Date.now() - (typingDotsShownAt || Date.now())
  const remaining = Math.max(0, TYPING_DOTS_MIN_MS - visibleFor)
  if (remaining) await sleep(remaining)
}

function stopTypingIndicator() {
  clearTypingDotsTimer()
  typingDotsVisible.value = false
  typingDotsShownAt = 0
}

function onMessageContentClick(event) {
  const link = event.target?.closest?.('a.bella-chat-link-inline')
  if (!link) return
  event.preventDefault()
  const topic = link.dataset.chatTopic
  if (topic) navigateTo(`/bella/chat/${topic}`)
}

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

const loadMessages = async () => {
  chatError.value = ''
  loadingMessages.value = true
  try {
    const data = await $fetch(`${apiBase}/bella/messages`, {
      headers: patientTimeHeaders(),
      query: { topic: chatTopic.value },
    })
    messages.value = normalizeLoadedMessages(data.messages)
    aiEnabled.value = data.aiEnabled !== false
    if (data.dailySummary) dailySummary.value = data.dailySummary
    if (!messages.value.length && chatTopic.value !== 'swap') seedWelcomeMessage()
  } finally {
    loadingMessages.value = false
  }

  if (chatTopic.value === 'swap') await ensureSwapFlowStarted()
  await scrollToBottomAfterLayout()
}

async function postSwapChat(body, userLabel = '') {
  chatError.value = ''
  sending.value = true
  pinningToBottom.value = true
  startTypingIndicator()

  const tempId = `temp-${Date.now()}`
  if (userLabel) {
    messages.value.push({
      id: tempId,
      role: 'user',
      content: userLabel,
      metadata: { topic: 'swap' },
    })
    await nextTick()
    await stickScrollToBottom()
  }

  try {
    const res = await $fetch(`${apiBase}/bella/chat`, {
      method: 'POST',
      headers: patientTimeHeaders(),
      body: { topic: 'swap', ...body },
    })

    if (userLabel) {
      const tempIndex = messages.value.findIndex((m) => m.id === tempId)
      if (tempIndex >= 0) {
        if (res.userMessage) messages.value[tempIndex] = res.userMessage
        else messages.value.splice(tempIndex, 1)
      }
    }

    await applyChatResponse(res)
    return res
  } catch (err) {
    if (userLabel) messages.value = messages.value.filter((m) => m.id !== tempId)
    chatError.value = formatChatError(err)
    throw err
  } finally {
    stopTypingIndicator()
    await stickScrollToBottom()
    sending.value = false
    setTimeout(() => {
      if (!loadingMessages.value) pinningToBottom.value = false
    }, 500)
  }
}

async function applyChatResponse(res) {
  if (res.requiresMealConfirmation && res.mealDraft) {
    mealDraft.value = res.mealDraft
    if (res.dailySummary) dailySummary.value = res.dailySummary
    await finishTypingIndicator()
    stopTypingIndicator()
    if (res.message) messages.value.push(res.message)
    showMealModal.value = true
    mealConfirmError.value = ''
    await stickScrollToBottom()
    return
  }

  if (res.message) {
    await finishTypingIndicator()
    stopTypingIndicator()
    const [assistantMessage] = normalizeLoadedMessages([res.message])
    if (assistantMessage) messages.value.push(assistantMessage)
    await stickScrollToBottom()
  }
}

async function ensureSwapFlowStarted() {
  if (findActiveSwapMessage(messages.value)) return
  if (messages.value.some((m) => m.role === 'assistant')) return
  await postSwapChat({ swapAction: 'init' })
}

async function handleSwapSelection(assistantMsg, option) {
  if (!assistantMsg?.id || !option?.id || sending.value) return
  const meta = assistantMsg.metadata || {}
  const step = meta.swapStep

  if (step === 'suggestion') {
    await postSwapChat({
      swapAction: 'custom_food',
      message: option.label,
      swapMealId: meta.swapMealId,
      swapFoodKey: meta.swapFoodKey,
      swapSelectionMessageId: assistantMsg.id,
    }, option.label)
    return
  }

  if (step === 'food') {
    await postSwapChat({
      swapAction: 'select_food',
      swapMealId: meta.swapMealId,
      swapFoodKey: option.id,
      swapSelectionMessageId: assistantMsg.id,
    }, option.label)
    return
  }

  await postSwapChat({
    swapAction: 'select_meal',
    swapMealId: option.id,
    swapSelectionMessageId: assistantMsg.id,
  }, option.label)
}

async function handleSwapModeAction(assistantMsg, action) {
  if (!assistantMsg?.id || sending.value) return
  const meta = assistantMsg.metadata || {}

  await postSwapChat({
    swapAction: action,
    swapMealId: meta.swapMealId,
    swapFoodKey: meta.swapFoodKey,
    swapSelectionMessageId: assistantMsg.id,
  }, action === 'show_suggestions' ? 'Ver sugestões' : '')
}

const retryLoad = async () => {
  try {
    await loadMessages()
    await loadDailySummary()
  } catch (err) {
    if (chatTopic.value !== 'swap') seedWelcomeMessage()
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
    await scrollToBottomAfterLayout()
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

  if (chatTopic.value === 'swap') {
    const activeSwap = activeSwapMessage.value
    if (activeSwap && hasActiveSwapMode(activeSwap)) {
      if (!text) return
      const meta = activeSwap.metadata || {}
      draft.value = ''
      await postSwapChat({
        swapAction: 'custom_food',
        message: text,
        swapMealId: meta.swapMealId,
        swapFoodKey: meta.swapFoodKey,
        swapSelectionMessageId: activeSwap.id,
      }, text)
      return
    }
    if (swapSelectionLocked.value) return
  }

  chatError.value = ''
  sending.value = true
  pinningToBottom.value = true
  startTypingIndicator()
  draft.value = ''
  const hint = taskHint.value || undefined
  const isPdf = file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
  const fallbackText = isPdf
    ? 'Analise este PDF, por favor.'
    : chatTopic.value === 'meal'
      ? 'Analise meu prato para registrar no diário de hoje.'
      : chatTopic.value === 'label'
        ? 'Analise este rótulo e classifique o consumo (Verde, Amarelo ou Vermelho).'
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
  await stickScrollToBottom()

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

    await applyChatResponse(res)
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
    stopTypingIndicator()
    await stickScrollToBottom()
    sending.value = false
    setTimeout(() => {
      if (!loadingMessages.value) pinningToBottom.value = false
    }, 500)
  }
}

async function bootstrapChat() {
  stopPinningToBottom()
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

  startPinningToBottom()

  try {
    await loadMessages()
    await loadDailySummary()
    await scrollToBottomAfterLayout()
    await sleep(120)
    scrollToBottom(true)
    if (pendingCameraOpen.value && topicConfig.value.acceptImages) {
      pendingCameraOpen.value = false
      await nextTick()
      openCamera()
    }
  } catch (err) {
    if (chatTopic.value !== 'swap') seedWelcomeMessage()
    chatError.value = formatChatError(err)
  } finally {
    setTimeout(() => stopPinningToBottom(), 800)
  }
}

watch(chatTopic, () => {
  bootstrapChat()
})

watch(loadingMessages, async (loading) => {
  if (!loading && pinningToBottom.value) {
    await scrollToBottomAfterLayout()
  }
})

onMounted(() => {
  bootstrapChat()
})

onBeforeUnmount(() => {
  stopTypingIndicator()
  stopPinningToBottom()
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  revokeBlobUrl(attachmentPreview.value?.url)
})
</script>

<style scoped>
.bella-chat-page {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 430px;
  margin: 0;
  background: var(--cf-bg);
  overflow: hidden;
  box-sizing: border-box;
  padding-bottom: env(safe-area-inset-bottom);
}

.bella-chat-sticky {
  flex-shrink: 0;
  z-index: 2;
  background: var(--cf-bg);
  border-bottom: 1px solid var(--cf-border);
}

.bella-chat-sticky :deep(.cf-header) {
  border-bottom: none;
}

.bella-diary-bar {
  margin: 0 1rem 0.65rem;
}

.bella-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  padding: 0.85rem 1.25rem 2.75rem;
  scroll-padding-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  scroll-behavior: auto;
  overflow-anchor: none;
}

.bella-typing-anchor {
  flex-shrink: 0;
  min-height: 0;
}

.bella-typing-anchor--reserved {
  min-height: 2.9rem;
}

.bella-scroll-anchor {
  flex-shrink: 0;
  width: 100%;
  height: 1px;
  pointer-events: none;
}

.bella-composer {
  flex-shrink: 0;
  background: var(--cf-surface);
  border-top: 1px solid var(--cf-border);
  padding-bottom: calc(0.65rem + env(safe-area-inset-bottom));
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

.bella-bubble-wrap--user-with-media {
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
  max-width: min(78%, 11.5rem);
}

.bella-msg-thumb {
  overflow: hidden;
  line-height: 0;
  width: 9.25rem;
  max-width: 100%;
  border: 1px solid var(--cf-border);
  border-radius: var(--cf-radius-msg-media, 1.25rem);
  background: var(--cf-surface);
  box-shadow: var(--cf-shadow);
}

.bella-msg-thumb .bella-msg-image {
  width: 100%;
  max-height: 8rem;
  object-fit: cover;
  object-position: center;
  border: none;
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

.bella-msg-image {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  object-fit: contain;
  object-position: center;
}

.bella-msg-plain {
  margin: 0;
}

.bella-bubble--user .bella-msg-pdf {
  margin-bottom: 0;
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

.bella-msg-formatted :deep(h3.bella-md-h) {
  margin: 0 0 0.45rem;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: inherit;
}

.bella-msg-formatted :deep(h3.bella-md-semaphore) {
  font-size: 0.95rem;
  padding: 0.35rem 0;
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

.bella-bubble--bot {
  background: var(--cf-surface);
  border: 1px solid var(--cf-border);
  border-bottom-left-radius: 6px;
  color: var(--cf-text);
  box-shadow: var(--cf-shadow);
}

.bella-bubble--bot:has(.bella-swap-actions) {
  width: min(100%, 18.5rem);
}

.bella-bubble--typing {
  display: flex;
  align-items: center;
  min-height: 2.5rem;
  padding: 0.85rem 1rem;
  box-sizing: border-box;
}

.bella-typing-dots {
  display: flex;
  gap: 4px;
  min-height: 7px;
}

.bella-typing-dots span {
  width: 7px;
  height: 7px;
  border-radius: var(--cf-radius-full);
  background: var(--cf-pink);
  opacity: 0.55;
  animation: bella-typing-pulse 1.2s infinite;
}

.bella-typing-dots span:nth-child(2) { animation-delay: 0.15s; }
.bella-typing-dots span:nth-child(3) { animation-delay: 0.3s; }

@keyframes bella-typing-pulse {
  0%, 80%, 100% { opacity: 0.35; }
  40% { opacity: 1; }
}

.bella-msg-formatted :deep(.bella-chat-link-inline) {
  display: inline-flex;
  align-items: center;
  margin-top: 0.35rem;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  background: var(--cf-pink-soft);
  color: var(--cf-pink-dark, #9f4f56);
  font-weight: 600;
  font-size: 0.8125rem;
  text-decoration: none;
  border: 1px solid #f0d4d8;
}

.bella-msg-formatted :deep(.bella-chat-link-inline:hover) {
  background: #fce8eb;
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
  padding: 0.65rem 1.25rem 0.5rem;
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
  .bella-typing-dots span,
  .bella-send-btn {
    animation: none;
    transition: none;
  }

  .bella-send-btn:not(:disabled):active {
    transform: none;
  }
}
</style>
