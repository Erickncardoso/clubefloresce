/** sessionStorage: evita loop de redirecionamento no webview do Instagram. */
export const INSTAGRAM_REDIRECT_STORAGE_KEY = 'cf-redirected-from-instagram'

export function isInstagramInAppBrowser(userAgent = '') {
  return String(userAgent || '').toLowerCase().includes('instagram')
}

export function isAndroidUserAgent(userAgent = '') {
  return String(userAgent || '').toLowerCase().includes('android')
}

export function isIosUserAgent(userAgent = '') {
  const ua = String(userAgent || '').toLowerCase()
  return ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')
}

export function shouldShowInstagramSafariEscape(userAgent) {
  const ua = userAgent ?? (typeof window !== 'undefined' ? window.navigator.userAgent : '')
  if (!ua) return false
  return isInstagramInAppBrowser(ua) && isIosUserAgent(ua)
}

function stripProtocol(href) {
  return String(href || '').replace(/^https?:\/\//, '')
}

/** URLs para abrir no Safari a partir do webview do Instagram (iOS). */
export function buildIosSafariEscapeUrls(href) {
  const url = String(href || '')
  const path = stripProtocol(url)
  const encoded = encodeURIComponent(url)
  return [
    `instagram://extbrowser?url=${encoded}`,
    `x-safari-https://${path}`,
    url,
  ]
}

/**
 * Tenta abrir no Safari (iOS). Com gesto do usuário (toque) funciona melhor.
 * Ordem: esquema nativo do Instagram → x-safari-https → reload https.
 */
export function tryIosSafariEscape(href, options = {}) {
  if (typeof window === 'undefined') return false
  const urls = buildIosSafariEscapeUrls(href || window.location.href)
  const setLocation = options.setLocation || ((value) => { window.location.href = value })
  const schedule = options.schedule || ((fn, ms) => window.setTimeout(fn, ms))

  setLocation(urls[0])
  schedule(() => setLocation(urls[1]), 350)
  schedule(() => setLocation(urls[2]), 1100)
  return true
}

/**
 * Redireciona do webview do Instagram para Chrome (Android) ou Safari (iOS).
 */
export function redirectFromInstagramInAppBrowser(options = {}) {
  if (typeof window === 'undefined') return false

  const ua = options.userAgent || window.navigator.userAgent || ''
  if (!isInstagramInAppBrowser(ua)) return false

  const storage = options.storage || window.sessionStorage
  if (storage?.getItem?.(INSTAGRAM_REDIRECT_STORAGE_KEY)) return false
  storage?.setItem?.(INSTAGRAM_REDIRECT_STORAGE_KEY, '1')

  const href = String(options.href || window.location.href)

  if (isAndroidUserAgent(ua)) {
    const path = stripProtocol(href)
    const fallback = encodeURIComponent(href)
    window.location.href = `intent://${path}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`
    return true
  }

  if (isIosUserAgent(ua)) {
    window.setTimeout(() => tryIosSafariEscape(href, options), 300)
    return true
  }

  return false
}

/** Script inline no <head> — roda antes do bundle Vue (crítico no Instagram). */
export function buildInstagramExternalBrowserInlineScript() {
  const key = INSTAGRAM_REDIRECT_STORAGE_KEY
  return `(function(){try{var ua=navigator.userAgent.toLowerCase();if(ua.indexOf('instagram')===-1)return;if(sessionStorage.getItem('${key}'))return;sessionStorage.setItem('${key}','1');var href=window.location.href;var path=href.replace(/^https?:\\/\\//,'');if(ua.indexOf('android')>-1){window.location.href='intent://'+path+'#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url='+encodeURIComponent(href)+';end';return;}if(ua.indexOf('iphone')>-1||ua.indexOf('ipad')>-1||ua.indexOf('ipod')>-1){setTimeout(function(){var enc=encodeURIComponent(href);window.location.href='instagram://extbrowser?url='+enc;setTimeout(function(){window.location.href='x-safari-https://'+path;},350);setTimeout(function(){window.location.href=href;},1100);},300);}}catch(e){}})();`
}
