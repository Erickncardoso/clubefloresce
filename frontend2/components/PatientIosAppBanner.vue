<script setup>
import { X } from 'lucide-vue-next'
import { openNativeAppOrStore } from '~/utils/native-app-links'
import { isStandalonePwa } from '~/utils/pwa-standalone'

const route = useRoute()
const config = useRuntimeConfig()

const visible = ref(false)
const dismissedKey = 'cf-ios-app-banner-dismissed'

function wasDismissed() {
  try {
    return Boolean(sessionStorage.getItem(dismissedKey))
  } catch {
    return false
  }
}

function dismiss() {
  visible.value = false
  try {
    sessionStorage.setItem(dismissedKey, '1')
  } catch {
    /* ignore */
  }
}

function isNativeWebView() {
  if (typeof window === 'undefined') return true
  return Boolean(window.ReactNativeWebView)
}

function isCheckoutPaymentPath(path) {
  if (path === '/assinatura/obrigado') return false
  return path === '/assinatura' || path.startsWith('/assinatura/')
}

const shouldShowOnRoute = computed(() => {
  if (!config.public.mobileApp) return false
  if (isCheckoutPaymentPath(route.path)) return false
  return true
})

function openApp() {
  openNativeAppOrStore()
}

onMounted(() => {
  if (!import.meta.client) return
  if (isNativeWebView()) return
  if (isStandalonePwa()) return
  if (wasDismissed()) return
  if (!shouldShowOnRoute.value) return

  const ua = window.navigator.userAgent || ''
  const isAppleMobile = /iPad|iPhone|iPod/.test(ua)
    || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  // Banner pensado para iPhone/iPad; em desktop não insiste.
  if (!isAppleMobile) return

  visible.value = true
})

watch(shouldShowOnRoute, (ok) => {
  if (!ok) {
    visible.value = false
    return
  }
  if (wasDismissed() || isNativeWebView() || isStandalonePwa()) return
  const ua = window.navigator.userAgent || ''
  const isAppleMobile = /iPad|iPhone|iPod/.test(ua)
    || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  if (isAppleMobile) visible.value = true
})
</script>

<template>
  <Transition name="ios-app-banner-slide">
    <aside
      v-if="visible && shouldShowOnRoute"
      class="ios-app-banner"
      role="status"
      aria-live="polite"
      aria-label="App Clube Florescer"
    >
      <div class="ios-app-banner__copy">
        <strong>Clube Florescer no iPhone</strong>
        <span>Se já tiver o app, abra. Se não, instale na App Store.</span>
      </div>
      <button type="button" class="ios-app-banner__cta cf-squircle--control" @click="openApp">
        Abrir / Instalar
      </button>
      <button
        type="button"
        class="ios-app-banner__dismiss"
        aria-label="Fechar aviso"
        @click="dismiss"
      >
        <X class="ios-app-banner__dismiss-icon" />
      </button>
    </aside>
  </Transition>
</template>

<style scoped>
.ios-app-banner {
  position: sticky;
  top: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0;
  padding: calc(0.55rem + env(safe-area-inset-top, 0px)) 0.75rem 0.55rem;
  border-bottom: 1px solid var(--cf-border, #e5e5ea);
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 6px 18px rgba(31, 33, 28, 0.06);
  backdrop-filter: blur(8px);
}

.ios-app-banner__copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.ios-app-banner__copy strong {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--cf-text, #1f211c);
}

.ios-app-banner__copy span {
  font-size: 0.7rem;
  line-height: 1.35;
  color: var(--cf-text-muted, #6f7863);
}

.ios-app-banner__cta {
  flex-shrink: 0;
  min-height: 2.15rem;
  padding: 0 0.75rem;
  border: none;
  border-radius: var(--cf-radius-control, 12px);
  background: var(--cf-pink, #8b967c);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.ios-app-banner__dismiss {
  flex-shrink: 0;
  width: 1.85rem;
  height: 1.85rem;
  border: none;
  border-radius: 50%;
  background: var(--cf-track, #eef0eb);
  color: var(--cf-text-muted, #6f7863);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.ios-app-banner__dismiss-icon {
  width: 0.95rem;
  height: 0.95rem;
}

.ios-app-banner-slide-enter-active,
.ios-app-banner-slide-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.ios-app-banner-slide-enter-from,
.ios-app-banner-slide-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}

@media (prefers-reduced-motion: reduce) {
  .ios-app-banner-slide-enter-active,
  .ios-app-banner-slide-leave-active {
    transition: none;
  }
}
</style>
