/**
 * iOS — overlays (modais, menu +, drawer) não cobrem a faixa do topo no PWA.
 * Corrige conflito com `inset: 0`, safe area e body fixed com --cf-vvh.
 */

import { PATIENT_APP_THEME_COLOR } from './patient-app-splash.mjs'

export const IOS_PWA_DIM_OVERLAY_SELECTOR = [
  '.cf-drawer-backdrop',
  '.modal-overlay',
  '.courses-modal-overlay',
  '.netflix-modal-overlay',
  '.cf-confirm-overlay',
  '.bella-sheet-backdrop',
  '.meal-sheet-backdrop',
  '.dieta-subs-overlay',
  '.dieta-extra-backdrop',
  '.mpht-modal__backdrop',
  '.mpdup-modal__backdrop',
  '.mpns-modal__backdrop',
  '.mpr-backdrop',
].join(', ')

const SAFE_AREA_PROBE_ID = 'cf-ios-safe-area-probe'
const OVERLAY_THEME_COLOR = '#1f211c'

function syncThemeColorForOverlay(active) {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  meta.setAttribute('content', active ? OVERLAY_THEME_COLOR : PATIENT_APP_THEME_COLOR)
}

/** @returns {number} */
function getSafeAreaTopPx() {
  const probe = document.getElementById(SAFE_AREA_PROBE_ID)
  if (!probe) return 0
  const h = probe.getBoundingClientRect().height
  return Number.isFinite(h) ? Math.ceil(h) : 0
}

/** @returns {{ top: number, height: number, width: number, left: number }} */
function getFullViewportCoverRect() {
  const vv = window.visualViewport
  const safeTop = getSafeAreaTopPx()
  const offsetTop = Math.max(0, vv?.offsetTop ?? 0)
  const offsetLeft = Math.max(0, vv?.offsetLeft ?? 0)
  const width = Math.ceil(vv?.width ?? window.innerWidth)

  const height = Math.ceil(
    Math.max(
      (vv?.height ?? window.innerHeight) + offsetTop + safeTop,
      window.innerHeight + safeTop,
      document.documentElement.clientHeight + safeTop,
      window.outerHeight || 0,
    ),
  )

  return {
    top: -(safeTop + offsetTop),
    left: offsetLeft,
    width,
    height,
  }
}

function ensureSafeAreaProbe() {
  if (document.getElementById(SAFE_AREA_PROBE_ID)) return

  const probe = document.createElement('div')
  probe.id = SAFE_AREA_PROBE_ID
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:0',
    'height:env(safe-area-inset-top, 0px)',
    'pointer-events:none',
    'visibility:hidden',
    'z-index:-1',
  ].join(';')
  document.documentElement.appendChild(probe)
}

function applyCoverRect(el, rect) {
  el.style.setProperty('position', 'fixed', 'important')
  el.style.setProperty('inset', 'auto', 'important')
  el.style.setProperty('top', `${rect.top}px`, 'important')
  el.style.setProperty('left', `${rect.left}px`, 'important')
  el.style.setProperty('right', 'auto', 'important')
  el.style.setProperty('bottom', 'auto', 'important')
  el.style.setProperty('width', `${rect.width}px`, 'important')
  el.style.setProperty('height', `${rect.height}px`, 'important')
  el.style.setProperty('min-height', `${rect.height}px`, 'important')
  el.style.setProperty('max-height', 'none', 'important')
}

function clearCoverRect(el) {
  if (!(el instanceof HTMLElement)) return
  delete el.dataset.cfIosOverlaySynced
  for (const prop of ['position', 'inset', 'top', 'left', 'right', 'bottom', 'width', 'height', 'min-height', 'max-height']) {
    el.style.removeProperty(prop)
  }
}

export function isVisibleOverlay(el) {
  if (!(el instanceof HTMLElement)) return false
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  if (Number.parseFloat(style.opacity) < 0.05) return false
  if (style.position !== 'fixed' && style.position !== 'absolute') return false
  const rect = el.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) return false
  return true
}

/** @param {HTMLElement | null | undefined} el */
export function applyIosPwaOverlayRect(el) {
  if (!el || typeof window === 'undefined') return
  applyCoverRect(el, getFullViewportCoverRect())
  el.dataset.cfIosOverlaySynced = '1'
}

/** @param {HTMLElement | null | undefined} el */
export function clearIosPwaOverlayRect(el) {
  clearCoverRect(el)
}

function collectDimOverlays(root = document) {
  /** @type {HTMLElement[]} */
  const found = []
  for (const el of root.querySelectorAll(IOS_PWA_DIM_OVERLAY_SELECTOR)) {
    if (isVisibleOverlay(el)) found.push(el)
  }
  return found
}

/**
 * @returns {() => void}
 */
export function installIosPwaOverlaySync() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}

  ensureSafeAreaProbe()

  /** @type {Set<HTMLElement>} */
  const tracked = new Set()

  function syncAll() {
    const overlays = collectDimOverlays()
    const active = overlays.length > 0 || document.documentElement.classList.contains('patient-quick-dial-open')

    for (const el of tracked) {
      if (!el.isConnected || !isVisibleOverlay(el)) {
        clearIosPwaOverlayRect(el)
        tracked.delete(el)
      }
    }

    for (const el of overlays) {
      tracked.add(el)
      applyIosPwaOverlayRect(el)
    }

    syncThemeColorForOverlay(active)
    document.documentElement.classList.toggle('cf-ios-pwa-overlay-active', active)
    document.documentElement.style.setProperty('--cf-ios-top-gap', `${Math.max(getSafeAreaTopPx(), 44)}px`)
  }

  const onViewportChange = () => syncAll()

  window.addEventListener('resize', onViewportChange, { passive: true })
  window.addEventListener('orientationchange', onViewportChange, { passive: true })
  const vv = window.visualViewport
  vv?.addEventListener('resize', onViewportChange, { passive: true })
  vv?.addEventListener('scroll', onViewportChange, { passive: true })

  const observer = new MutationObserver(() => {
    requestAnimationFrame(syncAll)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden'],
  })

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })

  syncAll()

  return () => {
    observer.disconnect()
    window.removeEventListener('resize', onViewportChange)
    window.removeEventListener('orientationchange', onViewportChange)
    vv?.removeEventListener('resize', onViewportChange)
    vv?.removeEventListener('scroll', onViewportChange)
    for (const el of tracked) clearIosPwaOverlayRect(el)
    tracked.clear()
    syncThemeColorForOverlay(false)
    document.documentElement.classList.remove('cf-ios-pwa-overlay-active')
    document.getElementById(SAFE_AREA_PROBE_ID)?.remove()
  }
}
