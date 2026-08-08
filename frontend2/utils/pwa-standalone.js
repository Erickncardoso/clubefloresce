export const PWA_UPDATING_KEY = 'cf-pwa-updating'
export const PWA_INSTALLED_KEY = 'cf-pwa-installed'

export function isStandalonePwa() {
  if (typeof window === 'undefined') return false

  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.matchMedia('(display-mode: minimal-ui)').matches
    || Boolean(window.navigator.standalone)
}

export function markPwaInstalled() {
  try {
    localStorage.setItem(PWA_INSTALLED_KEY, '1')
  } catch {
    // ignore storage errors (private mode, etc.)
  }
}

export function isPwaInstalledPersisted() {
  try {
    return localStorage.getItem(PWA_INSTALLED_KEY) === '1'
  } catch {
    return false
  }
}

export function hasInstalledPwa() {
  if (isStandalonePwa()) {
    markPwaInstalled()
    return true
  }
  return isPwaInstalledPersisted()
}

export function markPwaUpdating() {
  try {
    sessionStorage.setItem(PWA_UPDATING_KEY, '1')
  } catch {
    // ignore
  }
}

export function clearPwaUpdating() {
  try {
    sessionStorage.removeItem(PWA_UPDATING_KEY)
  } catch {
    // ignore
  }
}

export function isPwaUpdating() {
  try {
    return sessionStorage.getItem(PWA_UPDATING_KEY) === '1'
  } catch {
    return false
  }
}

/** Reload in-place to keep iOS standalone/home-screen mode. */
export function reloadPwaInPlace() {
  const { pathname, search, hash } = window.location
  window.location.replace(`${pathname}${search}${hash}`)
}

function stripProtocol(href) {
  return String(href || '').replace(/^https?:\/\//, '')
}

function isIosUa(ua = '') {
  const value = String(ua || '').toLowerCase()
  return value.includes('iphone') || value.includes('ipad') || value.includes('ipod')
}

function isAndroidUa(ua = '') {
  return String(ua || '').toLowerCase().includes('android')
}

/**
 * Abre URL no navegador do sistema (Safari/Chrome), saindo do PWA standalone.
 * Deve ser chamado de forma síncrona no handler do toque (gesto do usuário).
 */
export function openUrlInSystemBrowser(href) {
  if (typeof window === 'undefined') return false
  const url = String(href || '').trim()
  if (!url) return false

  const ua = window.navigator.userAgent || ''
  const standalone = isStandalonePwa()

  if (isIosUa(ua) && standalone) {
    // Esquema privado do iOS — abre Safari a partir do PWA (home screen).
    window.location.href = `x-safari-https://${stripProtocol(url)}`
    return true
  }

  if (isAndroidUa(ua) && standalone) {
    const path = stripProtocol(url)
    const fallback = encodeURIComponent(url)
    window.location.href = `intent://${path}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`
    return true
  }

  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (!opened) window.location.href = url
  return true
}
