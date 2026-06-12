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
          v-for="(msg, index) in messages"
          :key="msg.id"
          class="bella-bubble-wrap"
          :class="msg.role === 'user' ? 'bella-bubble-wrap--user' : 'bella-bubble-wrap--bot'"
        >
          <div v-if="msg.role === 'assistant'" class="bella-bot-avatar" aria-hidden="true">
            <img src="/falecomabella.webp" alt="" width="32" height="32" />
          </div>

          <template v-if="msg.role === 'user'">
            <div
              class="bella-user-stack"
              :class="{ 'bella-user-stack--media': userMessageImage(msg) }"
            >
              <button
                type="button"
                v-if="userMessageImage(msg)"
                class="bella-msg-thumb-btn"
                aria-label="Ampliar imagem"
                @click="openImageLightbox(userMessageImage(msg))"
              >
                <img
                  :src="userMessageImage(msg)"
                  alt="Imagem enviada"
                  class="bella-msg-thumb"
                  loading="lazy"
                />
              </button>
              <div
                v-if="shouldShowUserText(msg) || messageAttachment(msg)?.type === 'pdf'"
                class="bella-bubble bella-bubble--user"
              >
                <div v-if="messageAttachment(msg)?.type === 'pdf'" class="bella-msg-pdf">
                  <FileText class="bella-msg-pdf-icon" />
                  <span>{{ messageAttachment(msg).fileName }}</span>
                </div>
                <p v-if="shouldShowUserText(msg)" class="bella-msg-plain">{{ messageDisplayText(msg) }}</p>
              </div>
            </div>
          </template>

          <div v-else class="bella-bubble bella-bubble--bot">
            <button
              v-if="messageAttachment(msg)?.url && messageAttachment(msg).type === 'image'"
              type="button"
              class="bella-msg-thumb-btn"
              aria-label="Ampliar imagem"
              @click="openImageLightbox(messageAttachment(msg).url)"
            >
              <img
                :src="messageAttachment(msg).url"
                alt="Imagem enviada"
                class="bella-msg-thumb bella-msg-thumb--bot"
                loading="lazy"
              />
            </button>
            <div v-else-if="messageAttachment(msg)?.type === 'pdf'" class="bella-msg-pdf">
              <FileText class="bella-msg-pdf-icon" />
              <span>{{ messageAttachment(msg).fileName }}</span>
            </div>
            <div
              class="bella-msg-formatted"
              @click="onMessageContentClick"
              v-html="formatMessageContent(msg.content)"
            />
            <div v-if="isSwapModePending(msg, index)" class="bella-swap-mode">
              <label class="bella-swap-mode-label" :for="`swap-custom-${msg.id}`">
                Qual alimento quer incluir no lugar?
              </label>
              <div class="bella-swap-mode-row">
                <input
                  :id="`swap-custom-${msg.id}`"
                  v-model="swapCustomDraft"
                  type="text"
                  class="bella-swap-mode-input"
                  placeholder="Ex.: batata doce cozida"
                  :disabled="sending"
                  @keydown.enter.prevent="submitSwapCustom(msg)"
                />
                <button
                  type="button"
                  class="bella-swap-mode-submit"
                  :disabled="sending || !swapCustomDraft.trim()"
                  @click="submitSwapCustom(msg)"
                >
                  Calcular
                </button>
              </div>
              <button
                type="button"
                class="bella-swap-mode-suggest"
                :disabled="sending"
                @click="requestSwapSuggestions(msg)"
              >
                Ver sugestões de substituição
              </button>
            </div>
            <div v-if="isSwapSelectionPending(msg, index)" class="bella-swap-selection">
              <button
                v-for="option in msg.metadata.swapOptions"
                :key="option.id"
                type="button"
                class="bella-swap-selection-btn"
                :disabled="sending"
                @click="chooseSwapOption(msg, option)"
              >
                {{ option.label }}
              </button>
            </div>
            <div v-if="isRestaurantIntentPending(msg, index)" class="bella-restaurant-intent">
              <button
                type="button"
                class="bella-restaurant-intent-btn bella-restaurant-intent-btn--plan"
                :disabled="sending"
                @click="chooseRestaurantIntent('plan_fit', msg)"
              >
                Encaixar no plano
              </button>
              <button
                type="button"
                class="bella-restaurant-intent-btn bella-restaurant-intent-btn--free"
                :disabled="sending"
                @click="chooseRestaurantIntent('free_meal', msg)"
              >
                Refeição livre
              </button>
            </div>
          </div>
        </div>

      </template>

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

    <div class="bella-composer">
      <div v-if="chatError" class="bella-error-banner" role="alert">
        <p>{{ chatError }}</p>
        <button type="button" class="bella-error-retry" @click="retryLoad">Tentar novamente</button>
      </div>

      <div v-if="chatTopic === 'swap'" class="bella-swap-composer-hint">
        <button
          type="button"
          class="bella-swap-restart-btn"
          :disabled="sending"
          @click="initSwapFlow"
        >
          Nova substituição
        </button>
      </div>

      <form v-else class="bella-input-bar" @submit.prevent="sendMessage">
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
              <div class="bella-attach-chip">
                <img :src="attachmentPreview.url" alt="Imagem anexada" class="bella-attach-thumb" />
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
            <textarea
              ref="draftInputEl"
              v-model="draft"
              rows="1"
              :placeholder="topicConfig.placeholder"
              :disabled="sending"
              maxlength="4000"
              autocomplete="off"
              @input="resizeDraftInput"
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

    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="lightboxImageUrl"
          class="bella-image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Visualização da imagem"
          @click.self="closeImageLightbox"
        >
          <button type="button" class="bella-image-lightbox-close" aria-label="Fechar" @click="closeImageLightbox">
            <X class="bella-image-lightbox-close-icon" />
          </button>
          <img :src="lightboxImageUrl" alt="Imagem ampliada" class="bella-image-lightbox-img" />
        </div>
      </Teleport>
    </ClientOnly>
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
const swapCustomDraft = ref('')
const typingDotsVisible = ref(false)
const loadingMessages = ref(false)
const chatError = ref('')
const aiEnabled = ref(true)
const messagesEl = ref(null)
const fileInputEl = ref(null)
const cameraInputEl = ref(null)
const draftInputEl = ref(null)
const taskHint = ref('')
const selectedFile = ref(null)
const attachmentPreview = ref(null)
const pendingCameraOpen = ref(false)
const dailySummary = ref(null)
const showMealModal = ref(false)
const mealDraft = ref(null)
const confirmingMeal = ref(false)
const mealConfirmError = ref('')
const lightboxImageUrl = ref('')

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
const formatMessageContent = (content) => formatBellaMarkdown(content)

function isRestaurantIntentPending(msg, index) {
  if (msg?.role !== 'assistant' || !msg?.metadata?.pendingRestaurantIntent) return false
  if (msg.metadata?.resolvedRestaurantIntent) return false
  const later = messages.value.slice(index + 1)
  if (later.some((entry) => entry.role === 'assistant' && !entry.metadata?.pendingRestaurantIntent)) {
    return false
  }
  return true
}

function isSwapSelectionPending(msg, index) {
  if (msg?.role !== 'assistant' || !msg?.metadata?.pendingSwapSelection) return false
  if (msg.metadata?.resolvedSwapSelection) return false
  if (!Array.isArray(msg.metadata?.swapOptions) || !msg.metadata.swapOptions.length) return false
  const later = messages.value.slice(index + 1)
  if (later.some((entry) => entry.role === 'assistant' && entry.metadata?.pendingSwapSelection)) {
    return false
  }
  return true
}

function isSwapModePending(msg, index) {
  if (msg?.role !== 'assistant' || !msg?.metadata?.pendingSwapMode) return false
  if (msg.metadata?.resolvedSwapMode) return false
  const later = messages.value.slice(index + 1)
  if (later.some((entry) => entry.role === 'assistant' && !entry.metadata?.pendingSwapMode)) {
    return false
  }
  return true
}

function resolveSwapModeMessage(modeMsg) {
  const pendingIndex = messages.value.findIndex((m) => m.id === modeMsg.id)
  if (pendingIndex >= 0) {
    messages.value[pendingIndex] = {
      ...messages.value[pendingIndex],
      metadata: {
        ...(messages.value[pendingIndex].metadata || {}),
        pendingSwapMode: false,
        resolvedSwapMode: true,
      },
    }
  }
}

async function submitSwapCustom(modeMsg) {
  const replacement = swapCustomDraft.value.trim()
  if (!replacement || !modeMsg?.metadata?.swapMealId || !modeMsg?.metadata?.swapFoodKey || sending.value) {
    return
  }

  chatError.value = ''
  sending.value = true
  const startedAt = Date.now()
  startTypingIndicator()

  try {
    const res = await $fetch(`${apiBase}/bella/chat`, {
      method: 'POST',
      headers: patientTimeHeaders(),
      body: {
        topic: 'swap',
        swapAction: 'custom_food',
        swapMealId: modeMsg.metadata.swapMealId,
        swapFoodKey: modeMsg.metadata.swapFoodKey,
        swapSelectionMessageId: modeMsg.id,
        message: replacement,
      },
    })

    if (res.userMessage) messages.value.push(res.userMessage)
    if (res.message) {
      await finishTypingIndicator(startedAt)
      messages.value.push(res.message)
    }

    resolveSwapModeMessage(modeMsg)
    swapCustomDraft.value = ''
  } catch (err) {
    chatError.value = formatChatError(err)
  } finally {
    stopTypingIndicator()
    sending.value = false
    await scrollToBottom()
  }
}

async function requestSwapSuggestions(modeMsg) {
  if (!modeMsg?.metadata?.swapMealId || !modeMsg?.metadata?.swapFoodKey || sending.value) return

  chatError.value = ''
  sending.value = true
  const startedAt = Date.now()
  startTypingIndicator()

  try {
    const res = await $fetch(`${apiBase}/bella/chat`, {
      method: 'POST',
      headers: patientTimeHeaders(),
      body: {
        topic: 'swap',
        swapAction: 'show_suggestions',
        swapMealId: modeMsg.metadata.swapMealId,
        swapFoodKey: modeMsg.metadata.swapFoodKey,
        swapSelectionMessageId: modeMsg.id,
      },
    })

    if (res.userMessage) messages.value.push(res.userMessage)
    if (res.message) {
      await finishTypingIndicator(startedAt)
      messages.value.push(res.message)
    }

    resolveSwapModeMessage(modeMsg)
    swapCustomDraft.value = ''
  } catch (err) {
    chatError.value = formatChatError(err)
  } finally {
    stopTypingIndicator()
    sending.value = false
    await scrollToBottom()
  }
}

async function initSwapFlow() {
  if (chatTopic.value !== 'swap' || sending.value) return

  chatError.value = ''
  sending.value = true
  const startedAt = Date.now()
  startTypingIndicator()

  try {
    const res = await $fetch(`${apiBase}/bella/chat`, {
      method: 'POST',
      headers: patientTimeHeaders(),
      body: { topic: 'swap', swapAction: 'init' },
    })

    if (res.userMessage) messages.value.push(res.userMessage)
    if (res.message) {
      await finishTypingIndicator(startedAt)
      messages.value.push(res.message)
    }
  } catch (err) {
    chatError.value = formatChatError(err)
  } finally {
    stopTypingIndicator()
    sending.value = false
    await scrollToBottom()
  }
}

async function chooseSwapOption(selectionMsg, option) {
  if (!selectionMsg?.metadata?.swapStep || sending.value) return
  if (selectionMsg.metadata.swapStep === 'mode') return

  const step = selectionMsg.metadata.swapStep
  chatError.value = ''
  sending.value = true
  const startedAt = Date.now()
  startTypingIndicator()

  try {
    const body = {
      topic: 'swap',
      swapSelectionMessageId: selectionMsg.id,
      swapAction: step === 'meal' ? 'select_meal' : 'select_food',
      swapMealId: step === 'meal' ? option.id : selectionMsg.metadata.swapMealId,
      ...(step === 'food' ? { swapFoodKey: option.id } : {}),
    }

    const res = await $fetch(`${apiBase}/bella/chat`, {
      method: 'POST',
      headers: patientTimeHeaders(),
      body,
    })

    if (res.userMessage) messages.value.push(res.userMessage)
    if (res.message) {
      await finishTypingIndicator(startedAt)
      messages.value.push(res.message)
    }

    const pendingIndex = messages.value.findIndex((m) => m.id === selectionMsg.id)
    if (pendingIndex >= 0) {
      messages.value[pendingIndex] = {
        ...messages.value[pendingIndex],
        metadata: {
          ...(messages.value[pendingIndex].metadata || {}),
          pendingSwapSelection: false,
          resolvedSwapSelection: true,
        },
      }
    }
  } catch (err) {
    chatError.value = formatChatError(err)
  } finally {
    stopTypingIndicator()
    sending.value = false
    await scrollToBottom()
  }
}

async function chooseRestaurantIntent(intent, intentMsg) {
  const sourceUserMessageId = intentMsg?.metadata?.relatedUserMessageId
  if (!sourceUserMessageId || sending.value) return

  chatError.value = ''
  sending.value = true
  const startedAt = Date.now()
  startTypingIndicator()

  try {
    const res = await $fetch(`${apiBase}/bella/chat`, {
      method: 'POST',
      headers: patientTimeHeaders(),
      body: {
        topic: 'restaurant',
        restaurantIntent: intent,
        continueFromUserMessageId: sourceUserMessageId,
      },
    })

    if (res.userMessage) messages.value.push(res.userMessage)
    if (res.message) {
      await finishTypingIndicator(startedAt)
      messages.value.push(res.message)
    }

    const pendingIndex = messages.value.findIndex((m) => m.id === intentMsg.id)
    if (pendingIndex >= 0) {
      messages.value[pendingIndex] = {
        ...messages.value[pendingIndex],
        metadata: {
          ...(messages.value[pendingIndex].metadata || {}),
          pendingRestaurantIntent: false,
          resolvedRestaurantIntent: true,
        },
      }
    }
  } catch (err) {
    chatError.value = formatChatError(err)
  } finally {
    stopTypingIndicator()
    sending.value = false
    await scrollToBottom()
  }
}

const TYPING_DOTS_DELAY_MS = 2000
const TYPING_DOTS_MIN_MS = 1200

let typingDotsTimer = null
let typingDotsShownAt = 0

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
  typingDotsTimer = setTimeout(async () => {
    typingDotsVisible.value = true
    typingDotsShownAt = Date.now()
    typingDotsTimer = null
    await scrollToBottom()
  }, TYPING_DOTS_DELAY_MS)
}

async function finishTypingIndicator(startedAt) {
  clearTypingDotsTimer()

  if (!typingDotsVisible.value) {
    const elapsed = Date.now() - startedAt
    const wait = Math.max(0, TYPING_DOTS_DELAY_MS - elapsed)
    if (wait) await sleep(wait)
    typingDotsVisible.value = true
    typingDotsShownAt = Date.now()
    await nextTick()
    await scrollToBottom()
  }

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

function openImageLightbox(url) {
  if (!url) return
  lightboxImageUrl.value = url
  if (import.meta.client) document.body.style.overflow = 'hidden'
}

function closeImageLightbox() {
  lightboxImageUrl.value = ''
  if (import.meta.client) document.body.style.overflow = ''
}

function handleLightboxKeydown(event) {
  if (event.key === 'Escape') closeImageLightbox()
}

function revokeBlobUrl(url) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

function resizeDraftInput() {
  const el = draftInputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 120)}px`
}

function resetDraftInputHeight() {
  const el = draftInputEl.value
  if (!el) return
  el.style.height = 'auto'
}

function clearComposerFields() {
  selectedFile.value = null
  attachmentPreview.value = null
  if (fileInputEl.value) fileInputEl.value.value = ''
  if (cameraInputEl.value) cameraInputEl.value.value = ''
  taskHint.value = topicConfig.value.taskHint || ''
  nextTick(() => resetDraftInputHeight())
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
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => requestAnimationFrame(resolve))
  const el = messagesEl.value
  if (!el) return

  const bubbles = el.querySelectorAll('.bella-bubble-wrap')
  const last = bubbles[bubbles.length - 1]
  if (last) {
    last.scrollIntoView({ block: 'end', behavior: 'auto' })
  }
  el.scrollTop = el.scrollHeight
}

async function scrollToBottomAfterLayout() {
  await scrollToBottom()
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
  await scrollToBottom()
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
    if (!messages.value.length) {
      if (chatTopic.value === 'swap') {
        await initSwapFlow()
      } else {
        seedWelcomeMessage()
      }
    }
  } finally {
    loadingMessages.value = false
  }

  await scrollToBottomAfterLayout()
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
  nextTick(() => resetDraftInputHeight())
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
  const startedAt = Date.now()
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
        : chatTopic.value === 'restaurant'
          ? 'Qual a melhor opção para mim neste cardápio?'
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
      await finishTypingIndicator(startedAt)
      if (res.message) messages.value.push(res.message)
      showMealModal.value = true
      mealConfirmError.value = ''
    } else if (res.message) {
      await finishTypingIndicator(startedAt)
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
    stopTypingIndicator()
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
    await scrollToBottomAfterLayout()
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

watch(draft, () => nextTick(resizeDraftInput))

watch(lightboxImageUrl, (url) => {
  if (!import.meta.client) return
  if (url) {
    document.addEventListener('keydown', handleLightboxKeydown)
  } else {
    document.removeEventListener('keydown', handleLightboxKeydown)
  }
})

watch(chatTopic, () => {
  bootstrapChat()
})

onMounted(() => {
  bootstrapChat()
})

onBeforeUnmount(() => {
  stopTypingIndicator()
  closeImageLightbox()
  document.removeEventListener('keydown', handleLightboxKeydown)
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

.bella-bubble-wrap--user:has(.bella-user-stack--media) {
  max-width: min(92%, 12.5rem);
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

.bella-user-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
  min-width: 0;
  max-width: 100%;
}

.bella-msg-thumb-btn {
  display: block;
  padding: 0;
  border: none;
  background: transparent;
  cursor: zoom-in;
  line-height: 0;
}

.bella-msg-thumb {
  display: block;
  width: auto;
  max-width: 10.5rem;
  max-height: 10.5rem;
  height: auto;
  border-radius: 1rem;
  object-fit: cover;
  object-position: center;
  box-shadow: 0 2px 10px rgba(61, 36, 41, 0.14);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.bella-msg-thumb-btn:active .bella-msg-thumb {
  transform: scale(0.98);
}

.bella-msg-thumb--bot {
  margin-bottom: 0;
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

.bella-msg-formatted :deep(h3.bella-md-classification),
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

.bella-bubble--user .bella-msg-plain {
  color: #fff;
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
  align-items: center;
  padding: 0.85rem 1rem;
}

.bella-typing-dots {
  display: flex;
  gap: 4px;
}

.bella-typing-dots span {
  width: 7px;
  height: 7px;
  border-radius: var(--cf-radius-full);
  background: var(--cf-pink);
  opacity: 0.55;
  animation: bella-pulse 1.2s infinite;
}

.bella-typing-dots span:nth-child(2) { animation-delay: 0.15s; }
.bella-typing-dots span:nth-child(3) { animation-delay: 0.3s; }

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

.bella-restaurant-intent {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-top: 0.65rem;
}

.bella-restaurant-intent-btn {
  width: 100%;
  min-height: 2.4rem;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  border: 1.5px solid var(--pa-border, #e4e4e0);
  background: #fff;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
}

.bella-restaurant-intent-btn--plan {
  color: var(--cf-green-dark, #4d7348);
  border-color: rgba(77, 115, 72, 0.35);
  background: var(--cf-green-soft, #edf3eb);
}

.bella-restaurant-intent-btn--free {
  color: var(--cf-pink-dark, #a06267);
  border-color: rgba(193, 123, 128, 0.35);
  background: var(--cf-pink-soft, #faecef);
}

.bella-restaurant-intent-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.bella-swap-selection {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-top: 0.65rem;
}

.bella-swap-selection-btn {
  width: 100%;
  min-height: 2.4rem;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  border: 1.5px solid rgba(77, 115, 72, 0.35);
  background: var(--cf-green-soft, #edf3eb);
  color: var(--cf-green-dark, #4d7348);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
}

.bella-swap-selection-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.bella-swap-mode {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 0.65rem;
}

.bella-swap-mode-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--cf-text-muted, #6b7280);
}

.bella-swap-mode-row {
  display: flex;
  gap: 0.45rem;
}

.bella-swap-mode-input {
  flex: 1;
  min-height: 2.4rem;
  padding: 0.5rem 0.65rem;
  border-radius: 10px;
  border: 1.5px solid var(--pa-border, #e4e4e0);
  font-family: inherit;
  font-size: 0.82rem;
}

.bella-swap-mode-submit {
  min-height: 2.4rem;
  padding: 0 0.85rem;
  border-radius: 10px;
  border: none;
  background: var(--cf-pink, #c17b80);
  color: #fff;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.bella-swap-mode-submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.bella-swap-mode-suggest {
  width: 100%;
  min-height: 2.4rem;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  border: 1.5px solid rgba(77, 115, 72, 0.35);
  background: #fff;
  color: var(--cf-green-dark, #4d7348);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
}

.bella-swap-mode-suggest:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.bella-swap-composer-hint {
  padding: 0.85rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  align-items: stretch;
}

.bella-swap-composer-hint p {
  margin: 0;
  font-size: 0.82rem;
  color: var(--cf-text-muted, #6b7280);
  text-align: center;
}

.bella-swap-restart-btn {
  min-height: 2.5rem;
  border-radius: 10px;
  border: 1.5px solid var(--cf-pink, #c17b80);
  background: var(--cf-pink-soft, #faecef);
  color: var(--cf-pink-dark, #a06267);
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

.bella-swap-restart-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

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
  display: inline-flex;
  flex-shrink: 0;
  line-height: 0;
}

.bella-attach-thumb {
  display: block;
  width: auto;
  max-width: 5.5rem;
  max-height: 5.5rem;
  border-radius: 0.85rem;
  object-fit: cover;
  box-shadow: 0 2px 8px rgba(61, 36, 41, 0.12);
}

.bella-attach-chip img {
  display: block;
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
  align-items: flex-end;
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

.bella-input-row textarea {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  padding: 0.55rem 0.25rem;
  font-size: 0.9rem;
  font-family: inherit;
  color: var(--cf-text);
  resize: none;
  overflow-y: auto;
  max-height: 7.5rem;
  line-height: 1.4;
  field-sizing: content;
}

.bella-input-row textarea::placeholder {
  color: var(--cf-text-muted);
}

.bella-input-row textarea:focus {
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

.bella-bubble--bot .bella-msg-thumb-btn {
  margin-bottom: 0.45rem;
}

.bella-image-lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(0, 0, 0, 0.92);
}

.bella-image-lightbox-close {
  position: absolute;
  top: max(1rem, env(safe-area-inset-top));
  right: max(1rem, env(safe-area-inset-right));
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
  max-height: calc(100dvh - 2.5rem);
  object-fit: contain;
  border-radius: 0.75rem;
  user-select: none;
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
