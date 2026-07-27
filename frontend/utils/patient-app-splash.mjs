/** Splash / tela de abertura — HTML + CSS inline (antes do Vue hidratar). */

export const PATIENT_APP_SPLASH_BG = '#f8f9f6'

/** Cor do app em runtime — deve bater com --cf-bg e o header (evita faixa no topo do PWA iOS). */
export const PATIENT_APP_THEME_COLOR = '#ffffff'

export function syncPatientAppThemeColor(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc) return
  const meta = doc.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', PATIENT_APP_THEME_COLOR)
  doc.documentElement.style.backgroundColor = PATIENT_APP_THEME_COLOR
  if (doc.body) doc.body.style.backgroundColor = PATIENT_APP_THEME_COLOR
}

export const PATIENT_APP_SPLASH_INLINE_CSS = `
html,
body {
  background: ${PATIENT_APP_SPLASH_BG};
}

html.cf-mobile-app-splash-pending,
html.cf-mobile-app-splash-pending body {
  background: ${PATIENT_APP_SPLASH_BG} !important;
  margin: 0;
  min-height: 100%;
}

#cf-app-splash {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding:
    max(1rem, env(safe-area-inset-top, 0px))
    max(1rem, env(safe-area-inset-right, 0px))
    max(1rem, env(safe-area-inset-bottom, 0px))
    max(1rem, env(safe-area-inset-left, 0px));
  box-sizing: border-box;
  background: ${PATIENT_APP_SPLASH_BG};
  transition: opacity 0.38s ease, visibility 0.38s ease;
}

#cf-app-splash.cf-app-splash--hide {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.cf-app-splash__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  text-align: center;
}

.cf-app-splash__logo {
  display: block;
  width: auto;
  height: 4.5rem;
  object-fit: contain;
  animation: cf-app-splash-pulse 1.55s ease-in-out infinite;
  will-change: opacity;
}

.cf-app-splash__title {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #6f7863;
}

.cf-app-splash__subtitle {
  margin: -0.35rem 0 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 0.72rem;
  font-weight: 500;
  color: #8b967c;
}

@keyframes cf-app-splash-pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .cf-app-splash__logo {
    animation: cf-app-splash-pulse 2.2s ease-in-out infinite;
  }
}
`.trim()

export const PATIENT_APP_SPLASH_HTML = `
<div id="cf-app-splash" role="status" aria-live="polite" aria-busy="true" aria-label="Carregando Clube Florescer">
  <div class="cf-app-splash__inner">
    <img
      src="/icons/logovetorcarregamento.svg"
      alt=""
      width="59"
      height="83"
      class="cf-app-splash__logo"
      decoding="async"
      fetchpriority="high"
    />
    <p class="cf-app-splash__title">Clube Florescer</p>
    <p class="cf-app-splash__subtitle">Carregando…</p>
  </div>
</div>
`.trim()
