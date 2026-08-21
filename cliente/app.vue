<template>
  <div class="patient-app-shell" :class="{ 'patient-app-shell--gated': showAppGate }">
    <NuxtPwaManifest />
    <div class="patient-app-shell__main" :inert="showAppGate">
      <PatientIosAppBanner />
      <NuxtPage />
    </div>
    <PatientScreenDim v-if="config.public.mobileApp" />
    <PatientNavigationLoader />
    <PatientTabBar v-if="showTabBar" />
    <PatientQuickAccessFab v-if="showQuickAccessFab" />
    <PatientPwaUpdate />
    <CfConfirmModal />
    <AppToast />
    <PatientMealPlanUploadOverlay />
    <PatientPushPrompt :open="showPushPrompt" @dismiss="onPushPromptDismiss" />
    <PatientMealPlanGate :open="showMealPlanGate" />
    <PatientPremiumGateModal />
    <InstagramSafariEscape />
  </div>
</template>

<script setup>
import PatientNavigationLoader from '~/components/PatientNavigationLoader.vue'
import PatientPremiumGateModal from '~/components/PatientPremiumGateModal.vue'
import PatientQuickAccessFab from '~/components/PatientQuickAccessFab.vue'
import PatientScreenDim from '~/components/PatientScreenDim.vue'
import { usePatientTabBar } from '~/composables/usePatientTabBar'
import { usePatientAccessSync } from '~/composables/usePatientAccessSync'
import { isPatientAppAccessBlocked } from '~/utils/patient-access'
import { dismissPushPrompt, isPushPromptDismissed } from '~/utils/push-prompt-dismiss'
import { isPrivateLanHostname, isPushSecureContext } from '~/utils/resolve-api-base.mjs'
import { appleItunesAppMetaContent } from '~/utils/native-app-links'

const route = useRoute()
const config = useRuntimeConfig()
useVirtualKeyboard()

/** Safari Smart App Banner + card: PWA (login e logada); checkout só em /obrigado. */
const enableIosSmartAppBanner = computed(() => {
  if (!config.public.mobileApp) return false
  const path = route.path
  if (path === '/assinatura/obrigado') return true
  if (path === '/assinatura' || path.startsWith('/assinatura/')) return false
  return true
})

useHead(() => {
  if (!enableIosSmartAppBanner.value) {
    return {
      meta: [{
        key: 'apple-itunes-app',
        name: 'apple-itunes-app',
        content: undefined,
      }],
    }
  }
  return {
    meta: [{
      key: 'apple-itunes-app',
      name: 'apple-itunes-app',
      // Formato Apple: app-id + app-argument (scheme nativo). Ícone vem da App Store.
      content: appleItunesAppMetaContent(route.path || '/inicio'),
    }],
  }
})

if (config.public.mobileApp) {
  usePatientAccessSync()
}

if (import.meta.client && config.public.mobileApp) {
  document.documentElement.classList.add('cf-mobile-app')
}

const { getToken, bootstrapToken } = usePatientAuth()
const { verifiedUser } = useAuthSession()
const { hasPlan, planChecked, loading: planLoading } = usePatientMealPlan()
const {
  subscribed: pushSubscribed,
  checking: pushChecking,
  enabledOnServer: pushEnabledOnServer,
  supported: pushSupported,
  standalone: pushStandalone,
  needsHttps: pushNeedsHttps,
  initPushState,
} = usePushNotifications()

const pushPromptDismissed = useState('push-prompt-dismissed', () => false)

function onPushPromptDismiss() {
  dismissPushPrompt()
  pushPromptDismissed.value = true
}

const hideTabBarPaths = ['/', '/register', '/documento', '/onboarding', '/esqueci-senha', '/redefinir-senha', '/abrir']
const publicPaths = hideTabBarPaths

function isCheckoutPath(path) {
  return path === '/assinatura' || path.startsWith('/assinatura/')
}

const isAuthenticatedRoute = computed(() => {
  if (!config.public.mobileApp) return false
  if (publicPaths.includes(route.path)) return false
  bootstrapToken()
  return Boolean(getToken())
})

const hasActivePatientAccess = computed(() => {
  const user = verifiedUser.value
  if (!user) return false
  return !isPatientAppAccessBlocked(
    user.plan,
    user.accessExpiresAt,
    user.approvalEmailSentAt,
  )
})

if (import.meta.client && config.public.mobileApp) {
  pushPromptDismissed.value = isPushPromptDismissed()
  void initPushState()

  watch(isAuthenticatedRoute, (authenticated) => {
    if (authenticated && hasActivePatientAccess.value) void initPushState()
  })

  watch(hasActivePatientAccess, (active) => {
    if (active) void initPushState()
  })
}

const showPushPrompt = computed(() => {
  if (!isAuthenticatedRoute.value) return false
  if (isCheckoutPath(route.path)) return false
  if (!hasActivePatientAccess.value) return false
  if (route.path.startsWith('/onboarding')) return false
  if (pushPromptDismissed.value) return false
  if (pushChecking.value) return false
  if (!pushEnabledOnServer.value) return false
  if (pushSubscribed.value) return false
  // HTTP na rede local (ex.: 192.168.x) não suporta push — não bloquear o app.
  if (pushNeedsHttps.value) return false
  if (import.meta.client) {
    const host = window.location.hostname
    if (isPrivateLanHostname(host) && !isPushSecureContext(host)) return false
  }
  if (!pushSupported.value && !pushStandalone.value) return false
  return true
})

const showMealPlanGate = computed(() => {
  if (isCheckoutPath(route.path)) return false
  if (showPushPrompt.value) return false
  if (!isAuthenticatedRoute.value) return false
  if (!planChecked.value || planLoading.value) return false
  return !hasPlan.value
})

const showAppGate = computed(() => showPushPrompt.value || showMealPlanGate.value)

const { suppressed: tabBarSuppressed } = usePatientTabBar()

const showTabBar = computed(() => {
  if (showAppGate.value) return false
  if (tabBarSuppressed.value) return false
  if (isCheckoutPath(route.path)) return false
  if (hideTabBarPaths.includes(route.path)) return false
  if (route.path.startsWith('/modulos/')) return false
  return true
})

/** FAB (+) cobre o composer da Bella — some no chat. */
const showQuickAccessFab = computed(() => {
  if (!showTabBar.value || !config.public.mobileApp) return false
  if (route.path === '/bella' || route.path.startsWith('/bella/')) return false
  return true
})
</script>

<style>
html.cf-mobile-app,
html.cf-mobile-app body,
html.cf-mobile-app #__nuxt {
  margin: 0;
  min-height: 0;
  max-width: 100%;
  overflow-x: hidden;
}

body {
  background: #ffffff;
  font-family: var(--cf-font);
  -webkit-font-smoothing: antialiased;
}

.patient-app-shell {
  overflow-x: hidden;
  max-width: 100%;
  min-width: 0;
}

.patient-app-shell__main {
  overflow-x: hidden;
  max-width: 100%;
  min-width: 0;
}

.patient-app-shell--gated .patient-app-shell__main {
  pointer-events: none;
  user-select: none;
}
</style>
