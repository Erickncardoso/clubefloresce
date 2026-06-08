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

<script setup>
import { X } from 'lucide-vue-next'

const config = useRuntimeConfig()
const nuxtApp = useNuxtApp()

const visible = ref(false)
const isIos = ref(false)
const canInstall = ref(false)
const dismissedKey = 'cf-pwa-prompt-dismissed'

function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || Boolean(window.navigator.standalone)
}

function dismiss() {
  visible.value = false
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(dismissedKey, '1')
  }
}

async function install() {
  const pwa = nuxtApp.$pwa
  if (!pwa?.install) return
  await pwa.install()
  visible.value = false
}

function syncInstallState() {
  const pwa = nuxtApp.$pwa
  canInstall.value = Boolean(pwa?.showInstallPrompt)
  if (canInstall.value && !sessionStorage.getItem(dismissedKey)) {
    visible.value = true
  }
}

onMounted(() => {
  if (!config.public.mobileApp || isStandaloneMode()) return

  const ua = window.navigator.userAgent || ''
  isIos.value = /iPad|iPhone|iPod/.test(ua) && !window.MSStream

  if (sessionStorage.getItem(dismissedKey)) return

  if (isIos.value) {
    visible.value = true
    return
  }

  syncInstallState()

  const stop = watch(
    () => nuxtApp.$pwa?.showInstallPrompt,
    () => syncInstallState(),
    { immediate: true },
  )

  onUnmounted(stop)
})
</script>

<style scoped>
.pwa-prompt {
  position: fixed;
  left: 50%;
  bottom: calc(var(--cf-tab-h, 5.25rem) + env(safe-area-inset-bottom, 0px) + 0.65rem);
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
