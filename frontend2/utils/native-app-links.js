/** IDs / deep links do app nativo (App Store Connect / Expo). */
export const APPLE_APP_STORE_ID = '6795381418'
export const NATIVE_IOS_BUNDLE_ID = 'com.clubeflorescer.app'
export const NATIVE_APP_SCHEME = 'clubeflorescer'
export const NATIVE_APP_DEEP_LINK = 'clubeflorescer://inicio'

export const APPLE_APP_STORE_URL = `https://apps.apple.com/app/id${APPLE_APP_STORE_ID}`

/**
 * Meta Smart App Banner do Safari (iOS).
 * Se o app estiver instalado → Abrir; senão → App Store.
 */
export function appleItunesAppMetaContent(appArgumentPath = '/') {
  const path = String(appArgumentPath || '/').startsWith('/')
    ? String(appArgumentPath || '/')
    : `/${appArgumentPath}`
  const argument = `https://app.nutrisabellajardim.com.br${path}`
  return `app-id=${APPLE_APP_STORE_ID}, app-argument=${argument}`
}

export function openNativeAppOrStore() {
  if (typeof window === 'undefined') return
  const started = Date.now()
  window.location.href = NATIVE_APP_DEEP_LINK
  window.setTimeout(() => {
    if (Date.now() - started < 2200) {
      window.location.href = APPLE_APP_STORE_URL
    }
  }, 1600)
}
