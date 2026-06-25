<template>
  <div class="patient-app-shell" :class="{ 'patient-app-shell--gated': showMealPlanGate }">
    <NuxtPwaManifest />
    <div class="patient-app-shell__main" :inert="showMealPlanGate">
      <NuxtPage />
    </div>
    <PatientNavigationLoader />
    <PatientTabBar v-if="showTabBar" />
    <PatientPwaUpdate />
    <PatientPwaPrompt />
    <CfConfirmModal />
    <AppToast />
    <PatientMealPlanUploadOverlay />
    <PatientMealPlanGate :open="showMealPlanGate" />
  </div>
</template>

<script setup>
import PatientNavigationLoader from '~/components/PatientNavigationLoader.vue'
import { usePatientTabBar } from '~/composables/usePatientTabBar'

const route = useRoute()
const config = useRuntimeConfig()
useVirtualKeyboard()

if (import.meta.client && config.public.mobileApp) {
  document.documentElement.classList.add('cf-mobile-app')
}

const { getToken, bootstrapToken } = usePatientAuth()
const { hasPlan, planChecked, loading: planLoading } = usePatientMealPlan()

const hideTabBarPaths = ['/', '/register', '/documento', '/onboarding', '/esqueci-senha', '/redefinir-senha', '/abrir']
const publicPaths = hideTabBarPaths

const isAuthenticatedRoute = computed(() => {
  if (!config.public.mobileApp) return false
  if (publicPaths.includes(route.path)) return false
  bootstrapToken()
  return Boolean(getToken())
})

const showMealPlanGate = computed(() => {
  if (!isAuthenticatedRoute.value) return false
  if (!planChecked.value || planLoading.value) return false
  return !hasPlan.value
})

const { suppressed: tabBarSuppressed } = usePatientTabBar()

const showTabBar = computed(() => {
  if (showMealPlanGate.value) return false
  if (tabBarSuppressed.value) return false
  if (hideTabBarPaths.includes(route.path)) return false
  if (route.path.startsWith('/modulos/')) return false
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
