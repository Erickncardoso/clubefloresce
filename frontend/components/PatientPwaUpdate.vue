<script setup>
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
const lastActivity = ref(Date.now())

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

function tryAutoUpdate() {
  if (!pendingUpdate.value || updating.value) return
  if (document.hidden || !isUserActive()) {
    applyUpdate()
  }
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
  if (import.meta.dev) return

  navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange)

  for (const event of activityEvents) {
    window.removeEventListener(event, touchActivity)
  }
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template />
