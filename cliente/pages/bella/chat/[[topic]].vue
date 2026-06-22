<template>
  <div ref="chatPageEl" class="bella-chat-page">
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
          v-if="hasPreviousHistory && chatTopic !== 'swap'"
          class="bella-history-bar"
        >
          <button
            v-if="!showPreviousHistory"
            type="button"
            class="bella-history-btn"
            @click="openPreviousHistory"
          >
            Ver conversas anteriores
          </button>
          <button
            v-else
            type="button"
            class="bella-history-btn bella-history-btn--active"
            @click="closePreviousHistory"
          >
            Ocultar conversas anteriores
          </button>
        </div>

        <div
          v-for="msg in displayMessages"
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
              class="bella-msg-image bella-msg-image--clickable"
              loading="lazy"
              role="button"
              tabindex="0"
              @click="openImageLightbox(userMessageImage(msg))"
              @keydown.enter.prevent="openImageLightbox(userMessageImage(msg))"
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
                class="bella-msg-image cf-squircle cf-squircle--attach bella-msg-image--clickable"
                loading="lazy"
                role="button"
                tabindex="0"
                @click.stop="openImageLightbox(messageAttachment(msg).url)"
                @keydown.enter.prevent="openImageLightbox(messageAttachment(msg).url)"
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
              <BellaMealSlotPicker
                v-if="chatTopic === 'meal' && isWelcomeMessage(msg)"
                v-model="selectedMealId"
                :meals="mealSlotOptions"
                :logged-meal-ids="loggedMealIds"
                :disabled="sending"
                inline
              />
              <BellaSwapButtons
                v-if="chatTopic === 'swap' && (shouldShowSwapButtons(msg) || shouldShowSwapRestart(msg))"
                :message="msg"
                :disabled="sending"
                :show-restart="shouldShowSwapRestart(msg)"
                @select="(option) => handleSwapSelection(msg, option)"
                @mode="(action) => handleSwapModeAction(msg, action)"
                @custom="() => handleSwapCustomInput(msg)"
                @restart="handleSwapRestart"
              />
              <BellaRestaurantIntentButtons
                v-if="chatTopic === 'restaurant' && shouldShowRestaurantIntentButtons(msg)"
                :message="msg"
                :disabled="sending"
                @select="(option) => handleRestaurantIntent(msg, option)"
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

    <Teleport to="body">
      <div ref="composerDockEl" class="bella-composer-dock">
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

          <div class="bella-composer-shell" :class="{ 'has-attach': attachmentPreview }">
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
                  v-if="showCameraButton && chatTopic === 'meal'"
                  type="button"
                  class="bella-tool-btn bella-tool-btn--tips"
                  :disabled="sending"
                  aria-label="Ver dicas de foto"
                  @click="openPhotoGuide"
                >
                  <img src="/imgs/iconelampada.png" alt="" class="bella-tool-tip-icon" />
                </button>
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
                ref="composerInputEl"
                v-model="draft"
                type="text"
                :placeholder="composerPlaceholder"
                :disabled="sending || swapSelectionLocked || restaurantIntentLocked"
                maxlength="4000"
                autocomplete="off"
                enterkeyhint="send"
                @focus="onComposerFocus"
                @blur="onComposerBlur"
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
    </Teleport>

    <BellaMealConfirmModal
      :open="showMealModal"
      :draft="mealDraft"
      :daily-summary="dailySummary"
      :saving="confirmingMeal"
      :error="mealConfirmError"
      @cancel="cancelMealConfirm"
      @confirm="confirmMeal"
    />

    <BellaMealPhotoGuideSheet
      :open="showPhotoGuide"
      @close="onPhotoGuideClose"
      @complete="onPhotoGuideComplete"
    />

    <Teleport to="body">
      <div
        v-if="lightboxImageUrl"
        class="bella-image-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Imagem ampliada"
        @click.self="closeImageLightbox"
      >
        <button type="button" class="bella-image-lightbox-close" aria-label="Fechar" @click="closeImageLightbox">
          <X class="bella-image-lightbox-close-icon" />
        </button>
        <img :src="lightboxImageUrl" alt="Imagem ampliada" class="bella-image-lightbox-img" />
      </div>
    </Teleport>
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
import { buildFallbackMealSlotOptions } from '~/utils/meal-slot-options'
import {
  saveBellaChatHandoff,
  consumeBellaChatHandoff,
  buildChatHandoffFromMessages,
} from '~/utils/bella-chat-handoff'
import {
  findActiveSwapMessage,
  findLatestCompletedSwapMessage,
  hasActiveSwapMode,
  hasActiveSwapSelection,
  isCompletedSwapMessage,
} from '~/utils/bella-swap'
import {
  findActiveRestaurantIntentMessage,
  hasActiveRestaurantIntent,
} from '~/utils/bella-restaurant'

definePageMeta({ layout: 'bella-chat', middleware: 'patient-only', pageTransition: false })

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
const historyMessages = ref([])
const showPreviousHistory = ref(false)
const draft = ref('')
const sending = ref(false)
const typingDotsVisible = ref(false)
const loadingMessages = ref(false)
const chatError = ref('')
const aiEnabled = ref(true)
const messagesEl = ref(null)
const bottomAnchor = ref(null)
const composerDockEl = ref(null)
const chatPageEl = ref(null)
const fileInputEl = ref(null)
const cameraInputEl = ref(null)
const composerInputEl = ref(null)
const taskHint = ref('')
const selectedFile = ref(null)
const attachmentPreview = ref(null)
const pendingCameraOpen = ref(false)
const showPhotoGuide = ref(false)

const MEAL_PHOTO_GUIDE_KEY = 'bella-meal-photo-guide-v2'
const dailySummary = ref(null)
const lightboxImageUrl = ref('')
const handoffSending = ref(false)
const showMealModal = ref(false)
const mealDraft = ref(null)
const nutritionRefresh = useState('patient-nutrition-refresh', () => 0)
const confirmingMeal = ref(false)
const mealConfirmError = ref('')
const pinningToBottom = ref(false)
const selectedMealId = ref('')

const { fetchPlan } = usePatientMealPlan()
const { mealList, mealOrder, getMealById, getMealIdForTime } = useMealPlan()

const mealSlotOptions = computed(() => {
  if (mealList.value.length) return mealList.value
  return buildFallbackMealSlotOptions()
})

const selectedMeal = computed(() => {
  const options = mealSlotOptions.value
  if (!options.length) return null
  return options.find((meal) => meal.id === selectedMealId.value) || options[0]
})

const loggedMealIds = computed(() => {
  const entries = dailySummary.value?.entries || []
  return [...new Set(entries.map((entry) => entry.mealType).filter(Boolean))]
})

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
  if (swapSelectionLocked.value || restaurantIntentLocked.value) return false
  return Boolean(draft.value.trim() || selectedFile.value)
})

function mergeThreadMessages(history, session) {
  const seen = new Set()
  const merged = []
  for (const msg of [...history, ...session]) {
    if (!msg?.id || seen.has(msg.id)) continue
    seen.add(msg.id)
    merged.push(msg)
  }
  return merged
}

const threadMessages = computed(() => mergeThreadMessages(historyMessages.value, messages.value))

const displayMessages = computed(() => {
  if (chatTopic.value === 'swap') return threadMessages.value
  return showPreviousHistory.value ? threadMessages.value : messages.value
})

const hasPreviousHistory = computed(() => historyMessages.value.length > 0)

const activeSwapMessage = computed(() => (
  chatTopic.value === 'swap' ? findActiveSwapMessage(threadMessages.value) : null
))

const activeRestaurantIntentMessage = computed(() => (
  chatTopic.value === 'restaurant'
    ? findActiveRestaurantIntentMessage(displayMessages.value)
    : null
))

const swapSelectionLocked = computed(() => (
  Boolean(activeSwapMessage.value && hasActiveSwapSelection(activeSwapMessage.value))
))

const restaurantIntentLocked = computed(() => (
  Boolean(activeRestaurantIntentMessage.value && hasActiveRestaurantIntent(activeRestaurantIntentMessage.value))
))

const composerPlaceholder = computed(() => {
  if (swapSelectionLocked.value) return 'Toque em uma sugestão ou em "Escreva outro alimento"'
  if (restaurantIntentLocked.value) return 'Escolha uma opção acima para continuar'
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

function shouldShowSwapRestart(msg) {
  if (chatTopic.value !== 'swap' || msg?.role !== 'assistant') return false
  if (activeSwapMessage.value) return false
  if (!isCompletedSwapMessage(msg)) return false
  const latest = findLatestCompletedSwapMessage(threadMessages.value)
  return latest?.id === msg?.id
}

function isActiveRestaurantIntentMessage(msg) {
  return Boolean(
    chatTopic.value === 'restaurant'
    && activeRestaurantIntentMessage.value
    && msg?.id === activeRestaurantIntentMessage.value.id,
  )
}

function shouldShowRestaurantIntentButtons(msg) {
  if (chatTopic.value !== 'restaurant' || msg?.role !== 'assistant') return false
  return isActiveRestaurantIntentMessage(msg)
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
  if (err?.statusCode === 504 || err?.status === 504 || /timeout|timed out|demorou muito/i.test(raw)) {
    return raw || 'A Bella demorou para analisar a foto. Tente outra imagem com boa luz ou envie de novo em instantes.'
  }
  return raw || 'Não foi possível falar com a Bella. Tente novamente.'
}

async function fetchBellaChat(options) {
  try {
    return await $fetch(`${apiBase}/bella/chat`, {
      ...options,
      timeout: BELLA_CHAT_TIMEOUT_MS,
    })
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.cause?.name === 'TimeoutError') {
      throw Object.assign(
        new Error('A Bella demorou para analisar a foto. Tente outra imagem com boa luz ou envie de novo em instantes.'),
        { statusCode: 504 },
      )
    }
    throw err
  }
}

function isWelcomeMessage(msg) {
  return msg?.id === `welcome-${chatTopic.value}`
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

async function openPreviousHistory() {
  showPreviousHistory.value = true
  await nextTick()
  await scrollToBottomAfterLayout()
}

async function closePreviousHistory() {
  showPreviousHistory.value = false
  await nextTick()
  await scrollToBottomAfterLayout()
}

const messageAttachment = (msg) => getMessageAttachment(msg)
const messageDisplayText = (msg) => getMessageDisplayText(msg)
const userMessageImage = (msg) => getUserMessageImageUrl(msg)
const shouldShowUserText = (msg) => shouldShowUserMessageText(msg)
const userMessageShowsBubble = (msg) => {
  if (msg.role === 'assistant') return true
  if (messageAttachment(msg)?.type === 'pdf') return true
  if (shouldShowUserText(msg)) return true
  return !userMessageImage(msg)
}
const formatMessageContent = (content) => formatBellaMarkdown(content)

const TYPING_DOTS_DELAY_MS = 800
const TYPING_DOTS_MIN_MS = 1200
const BELLA_CHAT_TIMEOUT_MS = 120_000

let typingDotsTimer = null
let typingDotsShownAt = 0
let scrollRaf = null
let scrollRetryTimers = []
let messagesResizeObserver = null
let scrollRootEl = null
let lastScrollTop = 0
let autoScrolling = false
let userScrollIntent = false
let touchStartY = 0

function clearScrollRetryTimers() {
  scrollRetryTimers.forEach((id) => clearTimeout(id))
  scrollRetryTimers = []
}

function scheduleScrollRetries(delays = [0, 50, 120, 250, 450, 700, 1000, 1500, 2200]) {
  clearScrollRetryTimers()
  for (const delay of delays) {
    scrollRetryTimers.push(setTimeout(() => scrollToBottom(true), delay))
  }
}

function getScrollRoot() {
  if (!import.meta.client) return null
  return messagesEl.value
}

function getMessagesMaxScroll() {
  const el = getScrollRoot()
  if (!el) return 0
  return Math.max(0, el.scrollHeight - el.clientHeight)
}

function isScrollAtBottom(el, threshold = 12) {
  if (!el) return false
  return el.scrollTop >= getMessagesMaxScroll() - threshold
}

const scrollToBottom = (force = false) => {
  if (!import.meta.client) return
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = null
      const el = getScrollRoot()
      if (!el) return
      const maxScroll = getMessagesMaxScroll()
      const shouldForce = force || sending.value || pinningToBottom.value
      if (!shouldForce && el.scrollTop < maxScroll - 96) return

      autoScrolling = true
      el.scrollTop = maxScroll
      bottomAnchor.value?.scrollIntoView({ block: 'end', behavior: 'instant' })
      lastScrollTop = el.scrollTop
      requestAnimationFrame(() => {
        autoScrolling = false
      })
    })
  })
}

async function stickScrollToBottom() {
  pinningToBottom.value = true
  await scrollToBottomAfterLayout()
}

async function ensureScrollAtBottom(maxAttempts = 12) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await nextTick()
    scrollToBottom(true)
    await sleep(attempt < 4 ? 60 : 140)
    const el = getScrollRoot()
    if (isScrollAtBottom(el)) return true
  }
  return false
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
  if (!pending.length) {
    await ensureScrollAtBottom()
    return
  }

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
  await ensureScrollAtBottom()
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
  if (!topic) return
  persistChatHandoff(topic)
  navigateTo(`/bella/chat/${topic}`)
}

function getAllConversationMessages() {
  return [...historyMessages.value, ...messages.value]
}

function persistChatHandoff(targetTopic) {
  const payload = buildChatHandoffFromMessages(getAllConversationMessages(), {
    targetTopic,
    sourceTopic: chatTopic.value,
  })
  saveBellaChatHandoff(payload)
}

function openImageLightbox(url) {
  if (!url) return
  lightboxImageUrl.value = url
}

function closeImageLightbox() {
  lightboxImageUrl.value = ''
}

function onLightboxKeydown(event) {
  if (event.key === 'Escape') closeImageLightbox()
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

  return {
    ...msg,
    metadata: {
      ...(msg.metadata || {}),
      taskType: msg.metadata?.taskType || 'image',
      attachment: {
        ...(attachment || {}),
        type: 'image',
        fileName: attachment?.fileName || 'foto.jpg',
        url: fallbackUrl,
      },
    },
  }
}

function mergeUserMessageResponse(tempMsg, serverMsg, localPreviewUrl) {
  if (!serverMsg) return tempMsg

  const [normalized] = normalizeLoadedMessages([serverMsg])
  if (!normalized) return tempMsg

  let merged = { ...normalized }
  if (!merged.content?.trim() && tempMsg.content?.trim()) {
    merged.content = tempMsg.content
  }

  const tempImageUrl = getUserMessageImageUrl(tempMsg) || localPreviewUrl
  const serverImageUrl = getUserMessageImageUrl(merged)

  if (!serverImageUrl && tempImageUrl) {
    merged = patchUserMessageAttachment(merged, tempImageUrl)
  } else if (serverImageUrl?.startsWith('http') && tempImageUrl?.startsWith('blob:')) {
    revokeBlobUrl(tempImageUrl)
  }

  return merged
}

function getWelcomeContent() {
  const fromDieta = route.query.from === 'dieta'
  const mealLabel = typeof route.query.label === 'string' ? route.query.label.trim() : ''
  if (chatTopic.value === 'meal' && fromDieta && mealLabel) {
    return `Olá, ${userName()}! 📸 Escolhi ${mealLabel.toLowerCase()} nos botões abaixo — confira e envie a foto do prato.`
  }
  if (chatTopic.value === 'meal') {
    return `Olá, ${userName()}! 📸 Escolha a refeição logo abaixo (pode ser almoço mesmo sem ter registrado o café) e envie a foto do prato de cima, com boa luz.`
  }
  return topicConfig.value.welcome(userName())
}

function initMealSelection() {
  if (chatTopic.value !== 'meal') return
  const options = mealSlotOptions.value
  if (!options.length) {
    selectedMealId.value = ''
    return
  }

  const queryMeal = typeof route.query.meal === 'string' ? route.query.meal.trim() : ''
  if (queryMeal && options.some((meal) => meal.id === queryMeal)) {
    selectedMealId.value = queryMeal
    return
  }

  if (selectedMealId.value && options.some((meal) => meal.id === selectedMealId.value)) {
    return
  }

  const timeId = getMealIdForTime()
  selectedMealId.value =
    timeId && options.some((meal) => meal.id === timeId) ? timeId : options[0].id
}

function getSelectedMealPayload() {
  const meal = selectedMeal.value || getMealById(selectedMealId.value)
  if (!meal?.id) return null
  return {
    mealType: meal.id,
    mealLabel: meal.label || meal.short || 'Refeição',
  }
}

function appendMealPayloadToForm(form) {
  const payload = getSelectedMealPayload()
  if (!payload) return
  form.append('mealType', payload.mealType)
  form.append('mealLabel', payload.mealLabel)
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
  initMealSelection()
}

const loadMessages = async () => {
  chatError.value = ''
  loadingMessages.value = true
  try {
    const data = await $fetch(`${apiBase}/bella/messages`, {
      headers: patientTimeHeaders(),
      query: { topic: chatTopic.value },
    })
    historyMessages.value = normalizeLoadedMessages(data.messages)
    showPreviousHistory.value = historyMessages.value.length > 0
    messages.value = []
    aiEnabled.value = data.aiEnabled !== false
    if (data.dailySummary) dailySummary.value = data.dailySummary
    if (chatTopic.value !== 'swap') seedWelcomeMessage()
  } catch (err) {
    chatError.value = formatChatError(err)
    if (chatTopic.value !== 'swap') seedWelcomeMessage()
    throw err
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
    const res = await fetchBellaChat({
      method: 'POST',
      headers: patientTimeHeaders(),
      body: { topic: 'swap', ...body },
    })

    if (userLabel) {
      const tempIndex = messages.value.findIndex((m) => m.id === tempId)
      if (tempIndex >= 0) {
        if (res.userMessage) {
          messages.value[tempIndex] = mergeUserMessageResponse(
            messages.value[tempIndex],
            res.userMessage,
            null,
          )
        }
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
    return
  }

  chatError.value = 'A Bella não conseguiu responder. Tente enviar a foto novamente.'
}

async function sendHandoffMessage(handoff) {
  const text = handoff.question?.trim()
  if (!text || sending.value || handoffSending.value) return

  handoffSending.value = true
  chatError.value = ''
  sending.value = true
  pinningToBottom.value = true
  startTypingIndicator()

  const tempId = `temp-handoff-${Date.now()}`
  const imageUrl = handoff.imageUrl?.startsWith('http') ? handoff.imageUrl : null

  messages.value.push({
    id: tempId,
    role: 'user',
    content: text,
    metadata: imageUrl
      ? {
          taskType: 'image',
          handoffFromTopic: handoff.sourceTopic,
          attachment: {
            type: 'image',
            fileName: 'imagem-contexto.jpg',
            url: imageUrl,
          },
        }
      : null,
  })

  await stickScrollToBottom()

  try {
    const res = await fetchBellaChat({
      method: 'POST',
      headers: patientTimeHeaders(),
      body: {
        message: text,
        topic: chatTopic.value,
        contextImageUrl: imageUrl || undefined,
        handoffFromTopic: handoff.sourceTopic || undefined,
      },
    })

    const tempIndex = messages.value.findIndex((m) => m.id === tempId)
    if (tempIndex >= 0 && res.userMessage) {
      messages.value[tempIndex] = mergeUserMessageResponse(
        messages.value[tempIndex],
        res.userMessage,
        imageUrl,
      )
    }

    await applyChatResponse(res)
  } catch (err) {
    chatError.value = formatChatError(err)
    messages.value = messages.value.filter((m) => m.id !== tempId)
  } finally {
    stopTypingIndicator()
    await stickScrollToBottom()
    sending.value = false
    handoffSending.value = false
    setTimeout(() => {
      if (!loadingMessages.value) pinningToBottom.value = false
    }, 500)
  }
}

async function applyPendingHandoff() {
  if (!import.meta.client || chatTopic.value === 'swap') return
  const handoff = consumeBellaChatHandoff(chatTopic.value)
  if (!handoff?.question) return
  await nextTick()
  await sendHandoffMessage(handoff)
}

async function ensureSwapFlowStarted() {
  if (findActiveSwapMessage(threadMessages.value)) return
  await postSwapChat({ swapAction: 'init' })
}

async function handleSwapRestart() {
  if (sending.value) return
  await ensureSwapFlowStarted()
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

async function handleSwapCustomInput(assistantMsg) {
  if (!assistantMsg?.id || sending.value) return
  const meta = assistantMsg.metadata || {}
  if (!meta.swapMealId || !meta.swapFoodKey) return

  if (assistantMsg.metadata) {
    assistantMsg.metadata = {
      ...assistantMsg.metadata,
      pendingSwapSelection: false,
      resolvedSwapSelection: true,
    }
  }

  await postSwapChat({
    swapAction: 'enable_custom_swap',
    swapMealId: meta.swapMealId,
    swapFoodKey: meta.swapFoodKey,
    swapSelectionMessageId: assistantMsg.id,
  }, 'Quero digitar outro alimento')

  await nextTick()
  composerInputEl.value?.focus()
}

function resolveRestaurantIntentMessage(assistantMsg) {
  if (!assistantMsg?.metadata) return
  assistantMsg.metadata = {
    ...assistantMsg.metadata,
    pendingRestaurantIntent: false,
    resolvedRestaurantIntent: true,
  }
}

async function handleRestaurantIntent(assistantMsg, option) {
  if (!assistantMsg?.id || !option?.id || sending.value) return
  const continueFromUserMessageId = assistantMsg.metadata?.relatedUserMessageId
  if (!continueFromUserMessageId) return

  chatError.value = ''
  sending.value = true
  pinningToBottom.value = true
  startTypingIndicator()
  resolveRestaurantIntentMessage(assistantMsg)

  try {
    const res = await fetchBellaChat({
      method: 'POST',
      headers: patientTimeHeaders(),
      body: {
        topic: 'restaurant',
        restaurantIntent: option.id,
        continueFromUserMessageId,
      },
    })

    if (res.userMessage) {
      const [userMsg] = normalizeLoadedMessages([res.userMessage])
      if (userMsg) messages.value.push(userMsg)
    }

    await applyChatResponse(res)
  } catch (err) {
    if (assistantMsg.metadata) {
      assistantMsg.metadata.pendingRestaurantIntent = true
      assistantMsg.metadata.resolvedRestaurantIntent = false
    }
    chatError.value = formatChatError(err)
  } finally {
    stopTypingIndicator()
    await stickScrollToBottom()
    sending.value = false
    setTimeout(() => {
      if (!loadingMessages.value) pinningToBottom.value = false
    }, 500)
  }
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

function shouldShowMealPhotoGuide() {
  if (chatTopic.value !== 'meal') return false
  if (!import.meta.client) return false
  return localStorage.getItem(MEAL_PHOTO_GUIDE_KEY) !== '1'
}

function markMealPhotoGuideSeen() {
  if (import.meta.client) localStorage.setItem(MEAL_PHOTO_GUIDE_KEY, '1')
}

function openPhotoGuide() {
  showPhotoGuide.value = true
}

const openCamera = () => {
  if (shouldShowMealPhotoGuide()) {
    openPhotoGuide()
    return
  }
  cameraInputEl.value?.click()
}

function onPhotoGuideClose() {
  showPhotoGuide.value = false
}

function onPhotoGuideComplete() {
  markMealPhotoGuideSeen()
  showPhotoGuide.value = false
  nextTick(() => cameraInputEl.value?.click())
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
    nutritionRefresh.value += 1
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

  if (chatTopic.value === 'restaurant' && restaurantIntentLocked.value) return

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
      ? `Analise meu ${(selectedMeal.value?.label || 'prato').toLowerCase()} para registrar no diário de hoje.`
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
      if (chatTopic.value === 'meal') appendMealPayloadToForm(form)
      form.append('file', outgoingFile)

      res = await fetchBellaChat({
        method: 'POST',
        headers: patientTimeHeaders(),
        body: form,
      })
    } else {
      res = await fetchBellaChat({
        method: 'POST',
        headers: patientTimeHeaders(),
        body: {
          message: text,
          topic: chatTopic.value,
          taskHint: hint,
          ...(chatTopic.value === 'meal' ? getSelectedMealPayload() : {}),
        },
      })
    }

    const tempIndex = messages.value.findIndex((m) => m.id === tempId)
    if (tempIndex >= 0) {
      if (res.userMessage) {
        messages.value[tempIndex] = mergeUserMessageResponse(
          messages.value[tempIndex],
          res.userMessage,
          localPreviewUrl,
        )
      }
    }

    const savedUrl = tempIndex >= 0 ? getUserMessageImageUrl(messages.value[tempIndex]) : null
    if (localPreviewUrl && savedUrl?.startsWith('http') && localPreviewUrl !== savedUrl) {
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
  historyMessages.value = []
  showPreviousHistory.value = false
  chatError.value = ''
  userScrollIntent = false
  lastScrollTop = 0

  if (!import.meta.client) return

  const token = localStorage.getItem('auth_token')
  if (!token) {
    chatError.value = 'Faça login para conversar com a Bella.'
    if (chatTopic.value === 'meal') initMealSelection()
    seedWelcomeMessage()
    await nextTick()
    bindScrollRoot()
    await scrollToBottomAfterLayout()
    return
  }

  startPinningToBottom()

  try {
    if (chatTopic.value === 'meal') {
      await fetchPlan()
      initMealSelection()
    }
    await loadMessages()
    await loadDailySummary()
    if (chatTopic.value === 'meal') initMealSelection()
    await nextTick()
    bindScrollRoot()
    await scrollToBottomAfterLayout()
    if (pendingCameraOpen.value && topicConfig.value.acceptImages) {
      pendingCameraOpen.value = false
      await nextTick()
      if (shouldShowMealPhotoGuide()) {
        openPhotoGuide()
      } else {
        openCamera()
      }
    }
    await applyPendingHandoff()
  } catch (err) {
    if (chatTopic.value !== 'swap') seedWelcomeMessage()
    chatError.value = formatChatError(err)
    await nextTick()
    bindScrollRoot()
    await scrollToBottomAfterLayout()
  } finally {
    if (!userScrollIntent) {
      await ensureScrollAtBottom(16)
      setTimeout(() => {
        if (!userScrollIntent) stopPinningToBottom()
      }, 1200)
    }
  }
}

watch(mealSlotOptions, () => {
  if (chatTopic.value === 'meal') initMealSelection()
})

watch(selectedMealId, () => {
  if (chatTopic.value !== 'meal' || loadingMessages.value) return
  const welcomeId = `welcome-${chatTopic.value}`
  const welcome = messages.value.find((m) => m.id === welcomeId)
  if (welcome) {
    welcome.content = getWelcomeContent()
  }
})

watch(chatTopic, () => {
  bootstrapChat()
})

watch(loadingMessages, async (loading) => {
  if (loading || userScrollIntent) return
  await nextTick()
  bindScrollRoot()
  await scrollToBottomAfterLayout()
})

watch(
  () => displayMessages.value.length,
  async () => {
    if (userScrollIntent || loadingMessages.value) return
    if (!pinningToBottom.value && !sending.value) return
    await nextTick()
    scrollToBottom(true)
  },
)

watch(attachmentPreview, async () => {
  await nextTick()
  updateComposerDockHeight()
  if (!userScrollIntent) scrollToBottom(true)
})

watch(
  () => chatError.value,
  async () => {
    await nextTick()
    updateComposerDockHeight()
  },
)

function onUserScrollIntent() {
  userScrollIntent = true
  if (pinningToBottom.value) stopPinningToBottom()
}

function onMessagesScroll() {
  const el = scrollRootEl || getScrollRoot()
  if (!el || autoScrolling) return

  const scrolledUp = el.scrollTop < lastScrollTop - 6
  lastScrollTop = el.scrollTop

  if (!pinningToBottom.value) return
  if (scrolledUp && !isScrollAtBottom(el, 72)) onUserScrollIntent()
}

function onTouchStart(event) {
  touchStartY = event.touches?.[0]?.clientY ?? 0
}

function onTouchMove(event) {
  const y = event.touches?.[0]?.clientY ?? 0
  if (Math.abs(y - touchStartY) > 10) onUserScrollIntent()
}

function bindScrollRoot() {
  scrollRootEl?.removeEventListener('scroll', onMessagesScroll)
  scrollRootEl?.removeEventListener('wheel', onUserScrollIntent)
  scrollRootEl?.removeEventListener('touchstart', onTouchStart)
  scrollRootEl?.removeEventListener('touchmove', onTouchMove)

  scrollRootEl = getScrollRoot()
  if (!scrollRootEl) return

  lastScrollTop = scrollRootEl.scrollTop
  scrollRootEl.addEventListener('scroll', onMessagesScroll, { passive: true })
  scrollRootEl.addEventListener('wheel', onUserScrollIntent, { passive: true })
  scrollRootEl.addEventListener('touchstart', onTouchStart, { passive: true })
  scrollRootEl.addEventListener('touchmove', onTouchMove, { passive: true })

  if (pinningToBottom.value && !userScrollIntent) {
    scrollToBottom(true)
  }
}

let composerHeightObserver = null
let vvCleanup = null
let vkClassObserver = null

function getKeyboardInset() {
  if (!import.meta.client) return 0
  const vv = window.visualViewport
  if (!vv) return 0
  return Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0))
}

function syncComposerDockPosition() {
  if (!import.meta.client) return
  const dock = composerDockEl.value
  const page = chatPageEl.value
  if (!dock) return

  const root = document.documentElement
  const keyboardInset = getKeyboardInset()
  const keyboardOpen = keyboardInset > 80 || root.classList.contains('vk-open')
  const tabBar = root.querySelector('.cf-tab-bar-wrap')
  const tabBarVisible = Boolean(tabBar) && !keyboardOpen
  let dockBottomPx = 0

  if (keyboardOpen) {
    dockBottomPx = keyboardInset
    dock.style.setProperty('--bella-dock-bottom', `${keyboardInset}px`)
    dock.style.paddingBottom = 'max(0.5rem, env(safe-area-inset-bottom, 0px))'
  } else if (tabBarVisible) {
    dockBottomPx = Math.ceil(tabBar.getBoundingClientRect().height)
    dock.style.setProperty('--bella-dock-bottom', `${dockBottomPx}px`)
    dock.style.paddingBottom = '0'
  } else {
    dock.style.setProperty('--bella-dock-bottom', '0px')
    dock.style.paddingBottom = 'max(0.5rem, env(safe-area-inset-bottom, 0px))'
  }

  page?.style.setProperty('--bella-dock-bottom', `${dockBottomPx}px`)
}

function updateComposerDockHeight() {
  if (!import.meta.client) return
  const dock = composerDockEl.value
  const page = chatPageEl.value
  if (!dock || !page) return
  syncComposerDockPosition()
  const height = Math.ceil(dock.getBoundingClientRect().height)
  page.style.setProperty('--bella-composer-dock-h', `${height}px`)
  if (pinningToBottom.value) {
    requestAnimationFrame(() => scrollToBottom(true))
  }
}

function bindComposerHeightObserver() {
  composerHeightObserver?.disconnect()
  composerHeightObserver = null
  updateComposerDockHeight()
  const dock = composerDockEl.value
  if (!dock || typeof ResizeObserver === 'undefined') return
  composerHeightObserver = new ResizeObserver(() => updateComposerDockHeight())
  composerHeightObserver.observe(dock)
  const tabBar = document.querySelector('.cf-tab-bar-wrap')
  if (tabBar) composerHeightObserver.observe(tabBar)
}

function onComposerFocus() {
  userScrollIntent = false
  pinningToBottom.value = true
  syncComposerDockPosition()
  updateComposerDockHeight()
  scrollToBottom(true)
  setTimeout(() => {
    syncComposerDockPosition()
    updateComposerDockHeight()
    scrollToBottom(true)
  }, 120)
  setTimeout(() => {
    syncComposerDockPosition()
    scrollToBottom(true)
  }, 320)
}

function onComposerBlur() {
  setTimeout(() => {
    syncComposerDockPosition()
    updateComposerDockHeight()
  }, 120)
}

onMounted(async () => {
  if (import.meta.client && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual'
  }

  if (import.meta.client && window.visualViewport) {
    const vv = window.visualViewport
    const onVvChange = () => {
      syncComposerDockPosition()
      updateComposerDockHeight()
      requestAnimationFrame(() => scrollToBottom(true))
    }
    vv.addEventListener('resize', onVvChange, { passive: true })
    vv.addEventListener('scroll', onVvChange, { passive: true })
    vvCleanup = () => {
      vv.removeEventListener('resize', onVvChange)
      vv.removeEventListener('scroll', onVvChange)
    }
  }

  await bootstrapChat()
  await nextTick()
  bindComposerHeightObserver()
  syncComposerDockPosition()

  if (import.meta.client) {
    document.addEventListener('keydown', onLightboxKeydown)
    vkClassObserver = new MutationObserver(() => {
      syncComposerDockPosition()
      updateComposerDockHeight()
    })
    vkClassObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.removeEventListener('keydown', onLightboxKeydown)
  }
  vvCleanup?.()
  vkClassObserver?.disconnect()
  vkClassObserver = null
  composerHeightObserver?.disconnect()
  composerHeightObserver = null
  scrollRootEl?.removeEventListener('scroll', onMessagesScroll)
  scrollRootEl?.removeEventListener('wheel', onUserScrollIntent)
  scrollRootEl?.removeEventListener('touchstart', onTouchStart)
  scrollRootEl?.removeEventListener('touchmove', onTouchMove)
  scrollRootEl = null
  stopTypingIndicator()
  stopPinningToBottom()
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  revokeBlobUrl(attachmentPreview.value?.url)
})
</script>

<style scoped>
.bella-chat-page {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  width: 100%;
  max-width: 430px;
  margin: 0 auto;
  background: #f8f8fa;
  overflow: hidden;
  box-sizing: border-box;
  --bella-composer-dock-h: 5.75rem;
  --bella-dock-bottom: var(--cf-tab-h);
  --bella-messages-bottom-gap: 1rem;
}

.bella-chat-sticky {
  grid-row: 1;
  z-index: 2;
  background: #fff;
  border-bottom: none;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
}

.bella-chat-sticky :deep(.cf-header) {
  border-bottom: none;
  background: #fff;
}

.bella-diary-bar {
  margin: 0 1rem 0.65rem;
}

.bella-messages {
  grid-row: 2;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  padding: 1rem 1rem calc(
    var(--bella-composer-dock-h, 5.75rem) + var(--bella-dock-bottom, 0px) + var(--bella-messages-bottom-gap, 1rem)
  );
  scroll-padding-bottom: calc(
    var(--bella-composer-dock-h, 5.75rem) + var(--bella-dock-bottom, 0px) + var(--bella-messages-bottom-gap, 1rem)
  );
  scroll-behavior: auto;
  overflow-anchor: none;
  background: linear-gradient(180deg, #fff 0%, #f8f8fa 32%, #f5f4f6 100%);
  transition: padding-bottom 0.2s ease;
}

html.vk-open .bella-messages {
  padding-bottom: calc(
    var(--bella-composer-dock-h, 5.75rem) + var(--bella-dock-bottom, 0px) + 0.75rem
  );
  scroll-padding-bottom: calc(
    var(--bella-composer-dock-h, 5.75rem) + var(--bella-dock-bottom, 0px) + 0.75rem
  );
}

.bella-history-bar {
  display: flex;
  justify-content: center;
  margin-bottom: 0.85rem;
}

.bella-history-btn {
  appearance: none;
  border: 1px solid var(--cf-border);
  background: #fff;
  color: var(--cf-text-muted);
  font-size: 0.78rem;
  font-weight: 500;
  font-family: inherit;
  line-height: 1.2;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.bella-history-btn--active {
  color: var(--cf-pink-dark);
  border-color: #c8d4bc;
  background: var(--cf-pink-soft);
}

.bella-messages > .bella-bubble-wrap,
.bella-messages > .bella-typing-anchor {
  margin-bottom: 0.85rem;
}

.bella-messages > .bella-bubble-wrap:last-child,
.bella-messages > .bella-typing-anchor:last-child,
.bella-messages > .bella-scroll-anchor {
  margin-bottom: 0;
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
  border-radius: 50%;
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

/* Bubble layout */
.bella-bubble-wrap {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  max-width: 90%;
}

.bella-bubble-wrap--user {
  margin-left: auto;
  flex-direction: row-reverse;
  max-width: min(88%, 18.5rem);
}

.bella-bubble-wrap--user-with-media {
  margin-left: auto;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
  max-width: min(78%, 12.5rem);
}

.bella-bubble-wrap--bot {
  max-width: 94%;
}

/* User image thumb — dashed border style */
.bella-msg-thumb {
  overflow: hidden;
  line-height: 0;
  width: 10rem;
  max-width: 100%;
  border: 2px dashed #dbbfc1;
  border-radius: 1rem;
  background: #fff;
  padding: 0.3rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  aspect-ratio: 4 / 3;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bella-msg-thumb .bella-msg-image {
  width: 100%;
  height: 100%;
  max-height: none;
  object-fit: contain;
  object-position: center;
  border: none;
  border-radius: 0.7rem;
}

/* Bot avatar */
.bella-bot-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: #fff;
  border: 1.5px solid var(--cf-border);
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.bella-bot-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
}

/* Bubble base */
.bella-bubble {
  padding: 0.8rem 1rem;
  border-radius: 1.25rem;
  line-height: 1.55;
  font-size: 0.875rem;
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

.bella-msg-image--clickable {
  cursor: zoom-in;
}

.bella-image-lightbox {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(0, 0, 0, 0.92);
}

.bella-image-lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.bella-image-lightbox-close-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.bella-image-lightbox-img {
  max-width: min(100%, 960px);
  max-height: calc(100vh - 2.5rem);
  object-fit: contain;
  border-radius: 8px;
  user-select: none;
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
  border-radius: 0.75rem;
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

/* Formatted message content */
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

/* User bubble */
.bella-bubble--user {
  background: #fdf2f3;
  color: var(--cf-text);
  border: 1px solid #edcfd1;
  border-bottom-right-radius: 0.35rem;
}

/* Bot bubble */
.bella-bubble--bot {
  background: #fff;
  border: 1px solid var(--cf-border);
  border-bottom-left-radius: 0.35rem;
  color: var(--cf-text);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.bella-bubble--bot:has(.bella-swap-actions) {
  width: 100%;
}

/* Typing indicator */
.bella-bubble--typing {
  display: flex;
  align-items: center;
  min-height: 2.5rem;
  padding: 0.85rem 1rem;
  box-sizing: border-box;
}

.bella-typing-dots {
  display: flex;
  gap: 5px;
  min-height: 7px;
}

.bella-typing-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
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

/* Inline chat link */
.bella-msg-formatted :deep(.bella-chat-link-inline) {
  display: inline-flex;
  align-items: center;
  margin-top: 0.35rem;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  background: var(--cf-pink-soft);
  color: var(--cf-pink-dark);
  font-weight: 600;
  font-size: 0.8125rem;
  text-decoration: none;
  border: 1px solid #edcfd1;
}

.bella-msg-formatted :deep(.bella-chat-link-inline:hover) {
  background: #f5dfe1;
}

/* Composer */
.bella-composer-shell {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--cf-border);
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.bella-composer-shell:has(.bella-composer-attach) {
  border-radius: 1.25rem;
}

.bella-composer-shell.has-attach {
  border-radius: 1.25rem;
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
  border-radius: 0.75rem;
  overflow: hidden;
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
  border-radius: 50%;
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

/* Error */
.bella-error-banner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0.65rem 1.25rem 0;
  padding: 0.65rem 0.75rem;
  border-radius: 1rem;
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
  border-radius: 50%;
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

/* Input bar */
.bella-input-bar {
  padding: 0.65rem 1rem 0.5rem;
}

.bella-file-input {
  display: none;
}

.bella-input-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.3rem 0.2rem 0.65rem;
}

.bella-input-tools {
  display: flex;
  align-items: center;
  gap: 0.1rem;
  flex-shrink: 0;
}

.bella-tool-btn {
  width: 2.15rem;
  height: 2.15rem;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--cf-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease;
}

.bella-tool-btn:active {
  color: var(--cf-pink);
}

.bella-tool-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.attach-icon {
  width: 1.05rem;
  height: 1.05rem;
  stroke-width: 1.75;
}

.bella-tool-tip-icon {
  width: 1.15rem;
  height: 1.15rem;
  object-fit: contain;
  display: block;
}

.bella-input-row input[type='text'] {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  padding: 0.55rem 0.25rem;
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--cf-text);
}

.bella-input-row input[type='text']::placeholder {
  color: var(--cf-text-muted);
  font-weight: 400;
}

.bella-input-row input[type='text']:focus {
  outline: none;
}

/* Send button */
.bella-send-btn {
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: 50%;
  background: var(--cf-pink);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(193, 123, 128, 0.3);
  transition: background 0.15s ease, transform 0.15s ease;
}

.bella-send-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  box-shadow: none;
}

.bella-send-btn:not(:disabled):active {
  transform: scale(0.94);
  background: var(--cf-pink-dark);
}

.send-icon {
  width: 0.95rem;
  height: 0.95rem;
  stroke-width: 2.25;
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
  .bella-send-btn,
  .bella-tool-btn {
    animation: none;
    transition: none;
  }

  .bella-send-btn:not(:disabled):active {
    transform: none;
  }
}
</style>
