<script setup>
import { RefreshCw } from 'lucide-vue-next'
import {
  clearPwaUpdating,
  isPwaUpdating,
  markPwaUpdating,
  reloadPwaInPlace,
} from '~/utils/pwa-standalone'

const IDLE_MS = 45_000
const CHECK_MS = 5_000
const IOS_RELOAD_FALLBACK_MS = 1_200

const { $pwa } = useNuxtApp()
const route = useRoute()
const updating = ref(false)
const pendingUpdate = ref(false)
const dismissedThisSession = ref(false)
const lastActivity = ref(Date.now())

const showPrompt = computed(
  () => pendingUpdate.value && !updating.value && !dismissedThisSession.value,
)

let idleTimer = null
let checkTimer = null
let reloadFallbackTimer = null

function getNeedRefresh() {
  if (import.meta.dev) return false
  return Boolean($pwa?.needRefresh?.value ?? $pwa?.needRefresh)
}

function isUserActive() {
  if (typeof document === 'undefined') return false
  if (document.hidden) return false
  return Date.now() - lastActivity.value < IDLE_MS
}

function touchActivity() {
  lastActivity.value = Date.now()
}

function clearReloadFallback() {
  if (reloadFallbackTimer !== null) {
    clearTimeout(reloadFallbackTimer)
    reloadFallbackTimer = null
  }
}

function scheduleReloadFallback() {
  clearReloadFallback()
  reloadFallbackTimer = window.setTimeout(() => {
    if (!isPwaUpdating()) return
    clearPwaUpdating()
    reloadPwaInPlace()
  }, IOS_RELOAD_FALLBACK_MS)
}

function onControllerChange() {
  if (!isPwaUpdating()) return
  clearPwaUpdating()
  reloadPwaInPlace()
}

async function checkForUpdatesNow() {
  if (import.meta.dev) return

  try {
    await $pwa?.checkForUpdates?.()
  } catch {
    // fallback — API nativa do service worker
  }

  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    await reg?.update()
  } catch {
    // ignore — offline ou SW indisponível
  }
}

async function applyUpdate() {
  if (updating.value || !pendingUpdate.value) return
  updating.value = true
  stopWatchers()
  markPwaUpdating()

  try {
    await $pwa?.updateServiceWorker?.(false)
  } catch {
    clearPwaUpdating()
    reloadPwaInPlace()
    return
  }

  scheduleReloadFallback()
}

function dismissLater() {
  dismissedThisSession.value = true
}

function tryAutoUpdate() {
  if (!pendingUpdate.value || updating.value) return
  if (showPrompt.value && isUserActive()) return
  if (document.hidden || !isUserActive()) {
    applyUpdate()
  }
}

function onUpdateAvailable() {
  pendingUpdate.value = true
  dismissedThisSession.value = false
  tryAutoUpdate()
}

function onVisibilityChange() {
  if (!document.hidden) {
    void checkForUpdatesNow()
    return
  }

  if (pendingUpdate.value) {
    applyUpdate()
  }
}

function startWatchers() {
  stopWatchers()

  idleTimer = window.setTimeout(() => {
    if (pendingUpdate.value && !isUserActive()) {
      applyUpdate()
    }
  }, IDLE_MS)

  checkTimer = window.setInterval(() => {
    if (pendingUpdate.value && !updating.value && !isUserActive()) {
      applyUpdate()
    }
  }, CHECK_MS)
}

function stopWatchers() {
  if (idleTimer !== null) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
  if (checkTimer !== null) {
    clearInterval(checkTimer)
    checkTimer = null
  }
  clearReloadFallback()
}

const activityEvents = ['touchstart', 'touchmove', 'scroll', 'keydown', 'pointerdown', 'click']

watch(
  showPrompt,
  (open) => {
    if (!import.meta.client) return
    document.body.style.overflow = open ? 'hidden' : ''
  },
  { immediate: true },
)

onMounted(() => {
  clearPwaUpdating()

  if (import.meta.dev) return

  void checkForUpdatesNow()

  navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange)

  for (const event of activityEvents) {
    window.addEventListener(event, touchActivity, { passive: true })
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  watch(
    () => getNeedRefresh(),
    (need) => {
      if (need) {
        onUpdateAvailable()
        startWatchers()
      }
    },
    { immediate: true },
  )

  watch(
    () => route.fullPath,
    () => {
      if (pendingUpdate.value && !updating.value) {
        applyUpdate()
      }
    },
  )
})

onUnmounted(() => {
  stopWatchers()
  if (import.meta.client) document.body.style.overflow = ''

  if (import.meta.dev) return

  navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange)

  for (const event of activityEvents) {
    window.removeEventListener(event, touchActivity)
  }
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="pwa-update-fade">
      <div
        v-if="showPrompt"
        class="pwa-update-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-update-title"
      >
        <div class="pwa-update cf-squircle">
          <div class="pwa-update-icon-wrap" aria-hidden="true">
            <RefreshCw class="pwa-update-icon" />
          </div>

          <h2 id="pwa-update-title" class="pwa-update-title">
            Nova versão disponível
          </h2>

          <p class="pwa-update-copy">
            Atualize o app para receber correções e melhorias. Não precisa desinstalar —
            basta tocar em atualizar.
          </p>

          <div class="pwa-update-actions">
            <button
              type="button"
              class="pwa-update-btn"
              :disabled="updating"
              @click="applyUpdate"
            >
              {{ updating ? 'Atualizando…' : 'Atualizar agora' }}
            </button>
            <button
              type="button"
              class="pwa-update-btn pwa-update-btn--ghost"
              :disabled="updating"
              @click="dismissLater"
            >
              Depois
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pwa-update-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(0, 0, 0, 0.58);
  backdrop-filter: blur(4px);
}

.pwa-update {
  width: 100%;
  max-width: 20.5rem;
  padding: 1.25rem 1.1rem 1.1rem;
  background: var(--cf-surface, #fff);
  border: 1px solid var(--cf-border, rgba(23, 32, 20, 0.1));
  box-shadow: var(--cf-shadow-lg, 0 12px 40px rgba(0, 0, 0, 0.14));
  text-align: center;
}

.pwa-update-icon-wrap {
  width: 2.75rem;
  height: 2.75rem;
  margin: 0 auto 0.75rem;
  border-radius: 50%;
  background: var(--cf-pink-soft, rgba(139, 150, 124, 0.14));
  display: flex;
  align-items: center;
  justify-content: center;
}

.pwa-update-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--cf-pink-dark, #6f7863);
}

.pwa-update-title {
  margin: 0 0 0.45rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--cf-text, #172014);
}

.pwa-update-copy {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--cf-text-muted, #5c6558);
}

.pwa-update-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pwa-update-btn {
  width: 100%;
  min-height: 2.75rem;
  padding: 0.65rem 1rem;
  border: 0;
  border-radius: var(--cf-radius-control, 1.625rem);
  background: var(--cf-pink-dark, #6f7863);
  color: #fff;
  font-family: var(--cf-font, inherit);
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.pwa-update-btn:disabled {
  opacity: 0.72;
  cursor: wait;
}

.pwa-update-btn--ghost {
  background: transparent;
  color: var(--cf-text-muted, #5c6558);
  font-weight: 500;
}

.pwa-update-fade-enter-active,
.pwa-update-fade-leave-active {
  transition: opacity 0.2s ease;
}

.pwa-update-fade-enter-active .pwa-update,
.pwa-update-fade-leave-active .pwa-update {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.pwa-update-fade-enter-from,
.pwa-update-fade-leave-to {
  opacity: 0;
}

.pwa-update-fade-enter-from .pwa-update,
.pwa-update-fade-leave-to .pwa-update {
  transform: translateY(8px) scale(0.98);
  opacity: 0;
}
</style>
