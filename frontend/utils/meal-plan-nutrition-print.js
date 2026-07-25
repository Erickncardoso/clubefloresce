const PRINT_CSS = `
@page {
  size: A4 portrait;
  margin: 12mm 10mm 18mm;
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  color: #1a2e24;
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.mpns-print-doc {
  padding: 0;
}

.mpns-modal__panel {
  width: 100%;
  background: #fff;
}

.mpns-modal__body {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0 0 14mm;
}

.mpns-print-header {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  align-items: start;
  padding-bottom: 0.75rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.12);
  break-inside: avoid;
  page-break-inside: avoid;
}

.mpns-print-header__kicker {
  margin: 0 0 0.15rem;
  font-size: 9pt;
  color: rgba(15, 23, 42, 0.45);
}

.mpns-print-header__title {
  margin: 0 0 0.55rem;
  font-size: 18pt;
  line-height: 1.15;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.92);
}

.mpns-print-header__meta {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.35rem 0.75rem;
  margin: 0;
}

.mpns-print-header__meta dt {
  margin: 0;
  font-size: 7.5pt;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(15, 23, 42, 0.45);
}

.mpns-print-header__meta dd {
  margin: 0.1rem 0 0;
  font-size: 9pt;
  color: rgba(15, 23, 42, 0.85);
}

.mpns-print-header__brand {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding-top: 0.15rem;
}

.mpns-print-header__logo {
  width: auto;
  height: 34px;
  max-width: none;
  object-fit: contain;
  object-position: right center;
}

.mpns-print-intro {
  margin-bottom: 0.35rem;
  break-inside: avoid;
  page-break-inside: avoid;
}

.mpns-print-intro__title {
  margin: 0 0 0.35rem;
  font-size: 11pt;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.88);
}

.mpns-print-intro__macros {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 1rem;
  margin-bottom: 0.25rem;
  font-size: 9pt;
}

.mpns-print-intro__macro strong {
  font-weight: 700;
}

.mpns-print-intro__macro--carb { color: #2563eb; }
.mpns-print-intro__macro--prot { color: #dc2626; }
.mpns-print-intro__macro--fat { color: #d97706; }
.mpns-print-intro__macro--kcal { color: #7c3aed; }

.mpns-print-intro__note {
  margin: 0;
  font-size: 7.5pt;
  color: rgba(15, 23, 42, 0.45);
}

.mpns-section h3 {
  margin: 0.35rem 0 0.25rem;
  font-size: 10pt;
  padding: 0.2rem 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.mpns-detail-list {
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 1.625rem;
  overflow: hidden;
}

.mpns-nutrient-row {
  display: grid;
  grid-template-columns: minmax(6rem, 1.35fr) 4.5rem minmax(4rem, 1fr) 2.5rem;
  gap: 0.45rem;
  align-items: center;
  padding: 0.28rem 0.55rem;
  font-size: 8.5pt;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  background: rgba(15, 23, 42, 0.025);
}

.mpns-nutrient-row:last-child {
  border-bottom: 0;
}

.mpns-nutrient-row:nth-child(even) {
  background: rgba(15, 23, 42, 0.05);
}

.mpns-nutrient-row__label {
  color: rgba(15, 23, 42, 0.78);
}

.mpns-nutrient-row__value {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.mpns-nutrient-row__bar-wrap {
  height: 0.35rem;
  background: rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  overflow: hidden;
}

.mpns-nutrient-row__bar {
  height: 100%;
  border-radius: 999px;
}

.mpns-nutrient-row__bar--neutral { background: rgba(15, 23, 42, 0.22); }
.mpns-nutrient-row__bar--low { background: #f59e0b; }
.mpns-nutrient-row__bar--ok { background: #22c55e; }
.mpns-nutrient-row__bar--high { background: #ef4444; }

.mpns-nutrient-row__pct {
  text-align: right;
  font-size: 7.5pt;
  color: rgba(15, 23, 42, 0.55);
  font-variant-numeric: tabular-nums;
}

.mpns-print-foot {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0 10mm 4mm;
  background: #fff;
  font-size: 8.5pt;
  color: rgba(15, 23, 42, 0.55);
}

.mpns-print-foot__rule {
  border-top: 1px solid rgba(15, 23, 42, 0.12);
  margin-bottom: 1.5mm;
}

.mpns-print-foot__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 26px;
}

.mpns-print-foot__logo {
  width: auto;
  height: 26px;
  object-fit: contain;
  object-position: left center;
}

.mpns-print-foot__name {
  flex: 1;
  text-align: center;
}

.mpns-print-foot__page::after {
  content: 'Página ' counter(page);
  font-variant-numeric: tabular-nums;
}

@media screen {
  body {
    padding: 12px;
  }
}
`

function escapeHtml(value) {
  return String(value || '').replace(/[<>&"]/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
  }[char]))
}

function absolutizeImages(root) {
  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src')
    if (!src || src.startsWith('http') || src.startsWith('data:')) return
    img.setAttribute('src', `${window.location.origin}${src.startsWith('/') ? src : `/${src}`}`)
  })
}

function preparePrintPanel(panel) {
  const clone = panel.cloneNode(true)
  clone.querySelectorAll('.mpns-screen-only').forEach((el) => el.remove())
  clone.querySelectorAll('.mpns-nutrient-row__tools--screen').forEach((el) => el.remove())
  clone.querySelectorAll('.mpns-nutrient-layer').forEach((el) => el.remove())
  clone.querySelectorAll('.mpns-print-only').forEach((el) => {
    el.classList.remove('mpns-print-only')
    el.style.removeProperty('display')
  })
  absolutizeImages(clone)
  return clone
}

function buildPrintDocumentHtml(bodyHtml, title) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body class="mpns-print-doc">${bodyHtml}</body>
</html>`
}

function waitForImages(doc) {
  const images = Array.from(doc?.images || [])
  if (!images.length) return Promise.resolve()
  return Promise.all(images.map((img) => {
    if (img.complete) return Promise.resolve()
    return new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true })
      img.addEventListener('error', resolve, { once: true })
    })
  }))
}

function waitForDocumentReady(win) {
  return new Promise((resolve) => {
    if (!win) {
      resolve()
      return
    }
    if (win.document?.readyState === 'complete') {
      resolve()
      return
    }
    win.addEventListener('load', () => resolve(), { once: true })
  })
}

function triggerPrint(win, onDone) {
  if (!win?.document) {
    onDone?.()
    return
  }

  waitForDocumentReady(win)
    .then(() => waitForImages(win.document))
    .then(() => new Promise((resolve) => { window.setTimeout(resolve, 300) }))
    .then(() => {
      try {
        win.focus()
        win.print()
      } catch {
        onDone?.()
      }
    })
}

function openPrintWindow(html) {
  const features = 'width=860,height=720,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes'
  const printWin = window.open('about:blank', '_blank', features)
  if (!printWin) return null

  printWin.document.open()
  printWin.document.write(html)
  printWin.document.close()
  return printWin
}

function openPrintWindowFromBlob(html, { autoPrint = false } = {}) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const printWin = window.open(url, '_blank')
  if (!printWin) {
    URL.revokeObjectURL(url)
    return { win: null, revoke: null }
  }

  const revoke = () => URL.revokeObjectURL(url)
  printWin.addEventListener('load', () => {
    if (autoPrint) triggerPrint(printWin)
  }, { once: true })
  printWin.addEventListener('beforeunload', revoke, { once: true })
  window.setTimeout(revoke, 300000)
  return { win: printWin, revoke }
}

/** Abre o resumo em nova aba (estilo Dietbox). Não exige dependência extra — só Blob + window.open. */
export function openMealPlanNutritionInNewTab(panel, { title = 'Resumo Nutricional', autoPrint = false } = {}) {
  if (!panel || typeof window === 'undefined') return false

  const html = buildMealPlanNutritionPrintHtml(panel, { title })
  const result = openPrintWindowFromBlob(html, { autoPrint })
  if (result.win) return true

  const printWin = openPrintWindow(html)
  if (!printWin) return false

  if (autoPrint) {
    attachPrintLifecycle(printWin)
  }
  return true
}

function printViaSizedIframe(html) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', 'Pré-visualização de impressão')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'width:794px',
    'height:1123px',
    'border:0',
    'margin:0',
    'padding:0',
    'background:#fff',
    'z-index:2147483646',
    'pointer-events:none',
  ].join(';')

  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) {
    iframe.remove()
    return
  }

  doc.open()
  doc.write(html)
  doc.close()

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 800)
  }

  win.addEventListener('afterprint', cleanup, { once: true })
  window.setTimeout(cleanup, 120000)
  triggerPrint(win, cleanup)
}

function attachPrintLifecycle(printWin) {
  if (!printWin) return

  const closeLater = () => {
    window.setTimeout(() => {
      if (!printWin.closed) printWin.close()
    }, 400)
  }

  printWin.addEventListener('afterprint', closeLater, { once: true })
  window.setTimeout(() => {
    if (!printWin.closed) return
  }, 120000)

  triggerPrint(printWin)
}

export function buildMealPlanNutritionPrintHtml(panel, { title = 'Resumo Nutricional' } = {}) {
  if (!panel) return ''
  const prepared = preparePrintPanel(panel)
  return buildPrintDocumentHtml(prepared.outerHTML, title)
}

export function printHtmlDocument(html) {
  if (!html || typeof document === 'undefined') return 'failed'

  const printWin = openPrintWindow(html)
  if (printWin) {
    attachPrintLifecycle(printWin)
    return 'window'
  }

  const blobResult = openPrintWindowFromBlob(html, { autoPrint: true })
  if (blobResult.win) {
    attachPrintLifecycle(blobResult.win)
    return 'blob'
  }

  printViaSizedIframe(html)
  return 'iframe'
}

export function printFromIframeElement(iframe) {
  const win = iframe?.contentWindow
  if (!win) return Promise.resolve()

  return waitForDocumentReady(win)
    .then(() => waitForImages(win.document))
    .then(() => new Promise((resolve) => { window.setTimeout(resolve, 350) }))
    .then(() => {
      win.focus()
      win.print()
    })
}

export function printMealPlanNutritionPanel(panel, { title = 'Resumo Nutricional' } = {}) {
  if (!panel || typeof document === 'undefined') return 'failed'
  const html = buildMealPlanNutritionPrintHtml(panel, { title })
  return printHtmlDocument(html)
}
