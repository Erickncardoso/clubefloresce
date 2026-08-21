/** IDs / deep links do app nativo (App Store Connect / Expo). */
export const APPLE_APP_STORE_ID = '6795381418'
export const NATIVE_IOS_BUNDLE_ID = 'com.clubeflorescer.app'
export const NATIVE_APP_SCHEME = 'clubeflorescer'
export const NATIVE_APP_DEEP_LINK = 'clubeflorescer://inicio'

export const APPLE_APP_STORE_URL = `https://apps.apple.com/app/id${APPLE_APP_STORE_ID}`
/** Deep link direto na tela de avaliar (OTA-safe; modal nativo fica pro próximo build). */
export const APPLE_APP_STORE_REVIEW_URL =
  `https://apps.apple.com/app/id${APPLE_APP_STORE_ID}?action=write-review`

/**
 * Meta nativo do Safari: `<meta name="apple-itunes-app" content="...">`
 * O ícone vem da ficha da App Store (app-id). Sem app-id válido o banner some/fica sem arte.
 *
 * app-argument: URL passada ao app no "Abrir". Usamos o scheme nativo — Universal Link
 * no mesmo domínio costuma permanecer no Safari e não abre o app.
 */
export function appleItunesAppMetaContent(appArgumentPath = '/inicio') {
  const raw = String(appArgumentPath || '/inicio').trim() || '/inicio'
  const path = (raw.startsWith('/') ? raw.slice(1) : raw).replace(/^\/+/, '')
  const argument = !path || path === 'inicio'
    ? NATIVE_APP_DEEP_LINK
    : `${NATIVE_APP_SCHEME}://${path}`
  return `app-id=${APPLE_APP_STORE_ID}, app-argument=${argument}`
}

/**
 * Tenta abrir o app; só cai na App Store se o app não abriu
 * (antes o timeout mandava pra loja mesmo com o app já aberto).
 */
export function openNativeAppOrStore() {
  if (typeof window === 'undefined') return

  let openedNative = false
  let settled = false

  const cleanup = () => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', onHide)
    window.removeEventListener('blur', onHide)
  }

  const markOpened = () => {
    openedNative = true
  }

  const onHide = () => {
    markOpened()
  }

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') markOpened()
  }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onHide)
  window.addEventListener('blur', onHide)

  window.location.href = NATIVE_APP_DEEP_LINK

  window.setTimeout(() => {
    if (settled) return
    settled = true
    cleanup()
    if (openedNative || document.visibilityState === 'hidden') return
    window.location.href = APPLE_APP_STORE_URL
  }, 2000)
}

export function openAppStoreOnly() {
  if (typeof window === 'undefined') return
  window.location.href = APPLE_APP_STORE_URL
}
