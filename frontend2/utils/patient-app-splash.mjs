import { FLORESCER_LOGO_COLOR, FLORESCER_LOGO_PATH, FLORESCER_LOGO_STROKES } from './florescer-logo-path.js'

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
  height: 8.25rem;
  overflow: visible;
}

.cf-app-splash__trace {
  fill: none;
  stroke: ${FLORESCER_LOGO_COLOR};
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}

.cf-app-splash__trace--0 {
  animation: cf-logo-draw 1.05s linear forwards;
}

.cf-app-splash__trace--1 {
  animation: cf-logo-draw 0.65s linear 0.92s forwards;
}

.cf-app-splash__trace--2 {
  animation: cf-logo-draw 0.28s linear 1.5s forwards;
}

.cf-app-splash__paint {
  fill: ${FLORESCER_LOGO_COLOR};
  opacity: 0;
  animation: cf-logo-fill 0.42s ease 1.78s forwards;
}

@keyframes cf-logo-draw {
  to { stroke-dashoffset: 0; }
}

@keyframes cf-logo-fill {
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .cf-app-splash__trace {
    animation: none;
    stroke-dashoffset: 0;
  }

  .cf-app-splash__paint {
    animation: none;
    opacity: 1;
  }
}
`.trim()

export const PATIENT_APP_SPLASH_HTML = `
<div id="cf-app-splash" role="status" aria-live="polite" aria-busy="true" aria-label="Carregando Clube Florescer">
  <div class="cf-app-splash__inner">
    <svg class="cf-app-splash__logo" viewBox="0 0 295 415" width="93" height="132" fill="none" aria-hidden="true">
      ${FLORESCER_LOGO_STROKES.map((d, i) => `<path class="cf-app-splash__trace cf-app-splash__trace--${i}" pathLength="1" d="${d}" />`).join('\n      ')}
      <path class="cf-app-splash__paint" d="${FLORESCER_LOGO_PATH}" />
    </svg>
  </div>
</div>
`.trim()
