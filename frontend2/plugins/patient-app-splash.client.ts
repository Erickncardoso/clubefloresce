import {
  PATIENT_APP_SPLASH_BG,
  syncPatientAppThemeColor,
} from '~/utils/patient-app-splash.mjs'

const MIN_VISIBLE_MS = 480
const FADE_MS = 380

let splashShownAt = 0
let dismissScheduled = false

function getSplashEl() {
  return document.getElementById('cf-app-splash')
}

function removeSplashEl(el: HTMLElement) {
  el.remove()
  document.documentElement.classList.remove('cf-mobile-app-splash-pending')
  syncPatientAppThemeColor()
}

export function dismissPatientAppSplash() {
  const el = getSplashEl()
  if (!el || el.dataset.dismissed === '1') return
  if (dismissScheduled) return

  dismissScheduled = true
  el.dataset.dismissed = '1'

  const elapsed = Date.now() - splashShownAt
  const wait = Math.max(0, MIN_VISIBLE_MS - elapsed)

  window.setTimeout(() => {
    el.classList.add('cf-app-splash--hide')
    window.setTimeout(() => removeSplashEl(el), FADE_MS + 40)
  }, wait)
}

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) return

  const config = useRuntimeConfig()
  if (!config.public.mobileApp) {
    getSplashEl()?.remove()
    return
  }

  splashShownAt = Date.now()
  document.documentElement.classList.add('cf-mobile-app-splash-pending')
  document.documentElement.style.backgroundColor = PATIENT_APP_SPLASH_BG
  document.body.style.backgroundColor = PATIENT_APP_SPLASH_BG

  nuxtApp.hook('app:mounted', () => {
    dismissPatientAppSplash()
    syncPatientAppThemeColor()
  })

  nuxtApp.hook('page:finish', () => {
    dismissPatientAppSplash()
  })

  window.setTimeout(() => {
    dismissPatientAppSplash()
  }, 8000)
})
