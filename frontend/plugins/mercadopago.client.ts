const MP_SCRIPT_ID = 'mercadopago-sdk-v2'
const MP_SCRIPT_SRC = 'https://sdk.mercadopago.com/js/v2'

let loadPromise = null

function loadMercadoPagoScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Mercado Pago só está disponível no navegador.'))
  }

  if (window.MercadoPago) {
    return Promise.resolve(window.MercadoPago)
  }

  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(MP_SCRIPT_ID)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.MercadoPago))
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar Mercado Pago.')))
      return
    }

    const script = document.createElement('script')
    script.id = MP_SCRIPT_ID
    script.src = MP_SCRIPT_SRC
    script.async = true
    script.onload = () => resolve(window.MercadoPago)
    script.onerror = () => reject(new Error('Falha ao carregar Mercado Pago.'))
    document.head.appendChild(script)
  })

  return loadPromise
}

export default defineNuxtPlugin(() => {
  const mpState = useState('mercadopago-instance', () => null)

  async function initMercadoPago(publicKey, options = {}) {
    if (!publicKey) throw new Error('Chave pública do Mercado Pago ausente.')
    const MercadoPago = await loadMercadoPagoScript()
    const { testMode, ...sdkOptions } = options
    mpState.value = new MercadoPago(String(publicKey), {
      locale: 'pt-BR',
      ...(testMode ? { advancedFraudPrevention: false } : {}),
      ...sdkOptions,
    })
    return mpState.value
  }

  function getMercadoPago() {
    return mpState.value
  }

  return {
    provide: {
      initMercadoPago,
      getMercadoPago,
    },
  }
})
