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
const visible = ref(false)
const updating = ref(false)
const pendingUpdate = ref(false)
const lastActivity = ref(Date.now())

let idleTimer = null
let checkTimer = null
let reloadFallbackTimer = null

function getNeedRefresh() {
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

async function applyUpdate() {
  if (updating.value || !pendingUpdate.value) return
  updating.value = true
  visible.value = false
  stopWatchers()
  markPwaUpdating()

  try {
    // false = only activate the waiting worker; we control the reload ourselves.
    await $pwa?.updateServiceWorker?.(false)
  } catch {
    clearPwaUpdating()
    reloadPwaInPlace()
    return
  }

  // Safari/iOS often never fires controllerchange after skipWaiting.
  scheduleReloadFallback()
}

function tryAutoUpdate() {
  if (!pendingUpdate.value || updating.value) return

  if (document.hidden || !isUserActive()) {
    applyUpdate()
    return
  }

  visible.value = true
}

function onUpdateAvailable() {
  pendingUpdate.value = true
  tryAutoUpdate()
}

function onVisibilityChange() {
  if (document.hidden && pendingUpdate.value) {
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

onMounted(() => {
  clearPwaUpdating()

  if (import.meta.dev) return

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
})

onUnmounted(() => {
  stopWatchers()
  if (import.meta.dev) return

  for (const event of activityEvents) {
    window.removeEventListener(event, touchActivity)
  }
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="pwa-fab">
      <button
        v-if="visible"
        type="button"
        class="pwa-update-fab"
        :class="{ 'pwa-update-fab--loading': updating }"
        :disabled="updating"
        aria-live="polite"
        :aria-label="updating ? 'Atualizando o app' : 'Nova versão disponível. Toque para atualizar'"
        @click="applyUpdate"
      >
        <RefreshCw class="pwa-update-fab-icon" :class="{ 'pwa-update-fab-icon--spin': updating }" />
        <span class="pwa-update-fab-label">{{ updating ? 'Atualizando…' : 'Atualizar app' }}</span>
      </button>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pwa-update-fab {
  position: fixed;
  left: 50%;
  bottom: var(--cf-tab-clearance);
  z-index: 450;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.1rem;
  border: none;
  border-radius: 999px;
  background: var(--cf-pink);
  color: #fff;
  font-family: var(--cf-font);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transform: translateX(-50%);
  box-shadow:
    0 4px 14px rgba(193, 123, 128, 0.45),
    0 2px 6px rgba(0, 0, 0, 0.08);
  -webkit-tap-highlight-color: transparent;
  animation: pwa-fab-pulse 2.4s ease-in-out infinite;
}

.pwa-update-fab:focus-visible {
  outline: 2px solid var(--cf-pink-dark);
  outline-offset: 3px;
}

.pwa-update-fab:active:not(:disabled) {
  transform: translateX(-50%) scale(0.97);
  background: var(--cf-pink-dark);
}

.pwa-update-fab--loading {
  animation: none;
  opacity: 0.92;
  cursor: wait;
}

.pwa-update-fab-icon {
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
  stroke-width: 2.25;
}

.pwa-update-fab-icon--spin {
  animation: pwa-fab-spin 0.8s linear infinite;
}

.pwa-update-fab-label {
  white-space: nowrap;
}

html:not(:has(.cf-tab-bar-wrap)) .pwa-update-fab {
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
}

.pwa-fab-enter-active,
.pwa-fab-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.pwa-fab-enter-from,
.pwa-fab-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(0.75rem);
}

@keyframes pwa-fab-pulse {
  0%,
  100% {
    box-shadow:
      0 4px 14px rgba(193, 123, 128, 0.45),
      0 2px 6px rgba(0, 0, 0, 0.08);
  }
  50% {
    box-shadow:
      0 4px 20px rgba(193, 123, 128, 0.65),
      0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

@keyframes pwa-fab-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pwa-update-fab {
    animation: none;
  }

  .pwa-update-fab-icon--spin {
    animation: none;
  }
}
</style>
