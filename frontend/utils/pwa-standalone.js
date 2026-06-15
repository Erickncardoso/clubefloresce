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
