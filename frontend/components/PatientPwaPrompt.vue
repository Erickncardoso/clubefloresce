<script setup>
import { X } from 'lucide-vue-next'
import {
  hasInstalledPwa,
  isPwaUpdating,
  isStandalonePwa,
  markPwaInstalled,
} from '~/utils/pwa-standalone'

const config = useRuntimeConfig()
const nuxtApp = useNuxtApp()

const visible = ref(false)
const isIos = ref(false)
const canInstall = ref(false)
const dismissedKey = 'cf-pwa-prompt-dismissed'

/** @type {import('vue').Ref<BeforeInstallPromptEvent | null>} */
const deferredPrompt = ref(null)

function shouldSkipPrompt() {
  if (!config.public.mobileApp) return true
  if (isPwaUpdating()) return true
  if (hasInstalledPwa()) return true
  if (nuxtApp.$pwa?.isPWAInstalled?.value) {
    markPwaInstalled()
    return true
  }
  if (isStandalonePwa()) {
    markPwaInstalled()
    return true
  }
  return false
}

function dismiss() {
  visible.value = false
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(dismissedKey, '1')
  }
}

async function install() {
  if (deferredPrompt.value) {
    await deferredPrompt.value.prompt()
    await deferredPrompt.value.userChoice
    deferredPrompt.value = null
  } else if (nuxtApp.$pwa?.install) {
    await nuxtApp.$pwa.install()
  }
  canInstall.value = false
  visible.value = false
}

function onBeforeInstallPrompt(event) {
  event.preventDefault()
  deferredPrompt.value = event
  canInstall.value = true
  if (!sessionStorage.getItem(dismissedKey)) {
    visible.value = true
  }
}

function onAppInstalled() {
  deferredPrompt.value = null
  canInstall.value = false
  visible.value = false
}

function syncFromModule() {
  const pwa = nuxtApp.$pwa
  const available = Boolean(pwa?.showInstallPrompt?.value ?? pwa?.showInstallPrompt)
  if (available && !deferredPrompt.value) {
    canInstall.value = true
    if (!sessionStorage.getItem(dismissedKey)) visible.value = true
  }
}

onMounted(() => {
  if (shouldSkipPrompt()) return

  const ua = window.navigator.userAgent || ''
  isIos.value = /iPad|iPhone|iPod/.test(ua) && !window.MSStream

  if (sessionStorage.getItem(dismissedKey)) return

  watch(
    () => isPwaUpdating(),
    (updating) => {
      if (updating) visible.value = false
    },
  )

  if (isIos.value) {
    visible.value = true
    return
  }

  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.addEventListener('appinstalled', onAppInstalled)
  syncFromModule()

  const stop = watch(
    () => nuxtApp.$pwa?.showInstallPrompt?.value ?? nuxtApp.$pwa?.showInstallPrompt,
    () => syncFromModule(),
  )

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.removeEventListener('appinstalled', onAppInstalled)
    stop()
  })
})
</script>

<template>
  <Transition name="pwa-prompt-slide">
    <aside v-if="visible" class="pwa-prompt" role="status" aria-live="polite">
      <div class="pwa-prompt-copy">
        <strong class="pwa-prompt-title">Instale o Clube Florescer</strong>
        <p v-if="isIos" class="pwa-prompt-text">
          Toque em <span class="pwa-prompt-em">Compartilhar</span> e depois em
          <span class="pwa-prompt-em">Adicionar à Tela de Início</span>.
        </p>
        <p v-else class="pwa-prompt-text">
          Adicione o app à tela inicial para abrir como um aplicativo nativo.
        </p>
      </div>

      <div class="pwa-prompt-actions">
        <button v-if="canInstall" type="button" class="pwa-prompt-install" @click="install">
          Instalar
        </button>
        <button type="button" class="pwa-prompt-dismiss" aria-label="Fechar aviso" @click="dismiss">
          <X class="pwa-prompt-dismiss-icon" />
        </button>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.pwa-prompt {
  position: fixed;
  left: 50%;
  bottom: calc(var(--cf-tab-clearance) - 0.1rem);
  z-index: 110;
  width: min(calc(100% - 1.5rem), 24rem);
  transform: translateX(-50%);
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.85rem 0.9rem;
  border: 1px solid var(--cf-border);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: var(--cf-shadow-lg);
  backdrop-filter: blur(8px);
  box-sizing: border-box;
}

.pwa-prompt-copy {
  flex: 1;
  min-width: 0;
}

.pwa-prompt-title {
  display: block;
  margin-bottom: 0.2rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--cf-text);
}

.pwa-prompt-text {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--cf-text-muted);
}

.pwa-prompt-em {
  font-weight: 700;
  color: var(--cf-pink-dark);
}

.pwa-prompt-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.pwa-prompt-install {
  border: none;
  border-radius: 999px;
  padding: 0.45rem 0.75rem;
  background: var(--cf-pink);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}

.pwa-prompt-dismiss {
  width: 1.85rem;
  height: 1.85rem;
  border: none;
  border-radius: 50%;
  background: var(--cf-track);
  color: var(--cf-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.pwa-prompt-dismiss-icon {
  width: 0.95rem;
  height: 0.95rem;
}

.pwa-prompt-slide-enter-active,
.pwa-prompt-slide-leave-active {
  transition: transform 0.24s ease, opacity 0.24s ease;
}

.pwa-prompt-slide-enter-from,
.pwa-prompt-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(0.75rem);
}

@media (prefers-reduced-motion: reduce) {
  .pwa-prompt-slide-enter-active,
  .pwa-prompt-slide-leave-active {
    transition: none;
  }
}
</style>
