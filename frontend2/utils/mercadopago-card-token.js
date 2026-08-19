const MP_SCRIPT_ID = 'mercadopago-sdk-v2'
const MP_SCRIPT_SRC = 'https://sdk.mercadopago.com/js/v2'
const BRIDGE_ID = 'cf-mp-bridge'

let scriptPromise = null

function loadMercadoPagoScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Mercado Pago só está disponível no navegador.'))
  }
  if (window.MercadoPago) return Promise.resolve(window.MercadoPago)
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
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

  return scriptPromise
}

export function parseCardExpiration(value) {
  const cleaned = String(value || '').trim()
  const match = cleaned.match(/^(\d{1,2})\s*\/\s*(\d{2,4})$/)
  if (!match) throw new Error('Validade inválida. Use o formato MM/AA.')

  const month = Number(match[1])
  let year = Number(match[2])
  if (year < 100) year += 2000
  if (month < 1 || month > 12) throw new Error('Mês de validade inválido.')

  return { month, year }
}

function parseMpError(error) {
  if (!error) return 'Não foi possível tokenizar o cartão.'
  if (typeof error === 'string') return error
  if (Array.isArray(error)) {
    return error.map((item) => item?.message).filter(Boolean).join(' ') || 'Não foi possível tokenizar o cartão.'
  }
  return error?.message || 'Não foi possível tokenizar o cartão.'
}

const DEBIT_CARD_MESSAGE =
  'Aceitamos só cartão de crédito (Visa, Mastercard, Elo ou Amex) ou Pix. Este número é de débito.'

function listPaymentMethods(payload) {
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(payload)) return payload
  return []
}

function pickCreditPaymentMethodId(payload) {
  const list = listPaymentMethods(payload)
  const credit = list.find((item) => {
    if (item?.payment_type_id !== 'credit_card') return false
    return item?.status === 'active' || !item?.status
  })
  return String(credit?.id || '').trim()
}

function isDebitCardPayload(payload) {
  const list = listPaymentMethods(payload)
  if (!list.length) return false
  if (pickCreditPaymentMethodId(payload)) return false
  return list.some((item) => {
    const type = String(item?.payment_type_id || '')
    const id = String(item?.id || '').toLowerCase()
    return type === 'debit_card' || id.startsWith('deb') || id === 'maestro'
  })
}

async function detectCardPaymentMethod(mp, cardNumber) {
  const bin = String(cardNumber || '').replace(/\D/g, '').slice(0, 8)
  if (bin.length < 6) return { paymentMethodId: '', issuerId: '' }

  try {
    const methods = await mp.getPaymentMethods({ bin })
    if (isDebitCardPayload(methods)) {
      throw new Error(DEBIT_CARD_MESSAGE)
    }
    const paymentMethodId = pickCreditPaymentMethodId(methods)
    if (!paymentMethodId) return { paymentMethodId: '', issuerId: '' }

    let issuerId = ''
    try {
      const issuers = await mp.getIssuers({ paymentMethodId, bin })
      const list = Array.isArray(issuers) ? issuers : issuers?.results || []
      issuerId = String(list[0]?.id || '').trim()
    } catch {
      /* emissor opcional */
    }

    return { paymentMethodId, issuerId }
  } catch (err) {
    if (err instanceof Error && err.message === DEBIT_CARD_MESSAGE) throw err
    return { paymentMethodId: '', issuerId: '' }
  }
}

function ensureBridgeDom() {
  if (document.getElementById(BRIDGE_ID)) return

  const root = document.createElement('div')
  root.id = BRIDGE_ID
  root.setAttribute('aria-hidden', 'true')
  root.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none'
  root.innerHTML = `
    <form id="${BRIDGE_ID}-form">
      <input id="${BRIDGE_ID}-name" type="text" autocomplete="off" />
      <input id="${BRIDGE_ID}-number" type="text" autocomplete="off" />
      <input id="${BRIDGE_ID}-exp" type="text" autocomplete="off" />
      <input id="${BRIDGE_ID}-cvv" type="text" autocomplete="off" />
      <select id="${BRIDGE_ID}-id-type"><option value="CPF">CPF</option></select>
      <input id="${BRIDGE_ID}-id-num" type="text" autocomplete="off" />
      <select id="${BRIDGE_ID}-installments"><option value="1">1</option></select>
      <select id="${BRIDGE_ID}-issuer"><option value="">-</option></select>
    </form>
  `
  document.body.appendChild(root)
}

function fillBridgeForm(card, extras = {}) {
  const set = (id, value) => {
    const el = document.getElementById(`${BRIDGE_ID}-${id}`)
    if (el) el.value = String(value ?? '')
  }

  set('name', card.cardholderName)
  set('number', String(card.cardNumber || '').replace(/\D/g, ''))
  set('exp', card.expirationDate)
  set('cvv', card.securityCode)
  set('id-num', String(card.identification?.number || card.identificationNumber || '').replace(/\D/g, ''))

  const idType = document.getElementById(`${BRIDGE_ID}-id-type`)
  if (idType) idType.value = card.identification?.type || 'CPF'

  if (extras.issuerId) {
    const issuer = document.getElementById(`${BRIDGE_ID}-issuer`)
    if (issuer) {
      const value = String(extras.issuerId)
      if (![...issuer.options].some((option) => option.value === value)) {
        issuer.appendChild(new Option(value, value))
      }
      issuer.value = value
    }
  }
}

/**
 * Gera card_token pelo SDK oficial (CardForm) e a bandeira (payment_method_id).
 */
export async function createMercadoPagoCardToken(publicKey, card, amount = '19.90') {
  if (!publicKey) throw new Error('Chave pública do Mercado Pago ausente.')

  parseCardExpiration(card.expirationDate)
  ensureBridgeDom()
  fillBridgeForm(card)

  const MercadoPago = await loadMercadoPagoScript()
  const mp = new MercadoPago(String(publicKey), {
    locale: 'pt-BR',
    advancedFraudPrevention: false,
  })

  const detected = await detectCardPaymentMethod(mp, card.cardNumber)
  if (!detected.paymentMethodId) {
    throw new Error('Use um cartão de crédito Visa, Mastercard, Elo ou Amex, ou pague com Pix.')
  }
  fillBridgeForm(card, detected)

  return new Promise((resolve, reject) => {
    let cardForm = null
    let settled = false
    let tokenRequested = false

    const finish = (fn, value) => {
      if (settled) return
      settled = true
      try { cardForm?.unmount?.() } catch { /* noop */ }
      fn(value)
    }

    const requestToken = () => {
      if (tokenRequested || settled) return
      tokenRequested = true
      fillBridgeForm(card, detected)
      window.setTimeout(() => {
        try {
          cardForm.createCardToken()
        } catch (err) {
          finish(reject, err instanceof Error ? err : new Error(parseMpError(err)))
        }
      }, 80)
    }

    cardForm = mp.cardForm({
      amount: String(Number(amount) || 19.9),
      iframe: false,
      autoMount: true,
      form: {
        id: `${BRIDGE_ID}-form`,
        cardholderName: { id: `${BRIDGE_ID}-name` },
        cardNumber: { id: `${BRIDGE_ID}-number` },
        expirationDate: { id: `${BRIDGE_ID}-exp` },
        securityCode: { id: `${BRIDGE_ID}-cvv` },
        identificationType: { id: `${BRIDGE_ID}-id-type` },
        identificationNumber: { id: `${BRIDGE_ID}-id-num` },
        installments: { id: `${BRIDGE_ID}-installments` },
        issuer: { id: `${BRIDGE_ID}-issuer` },
      },
      callbacks: {
        onFormMounted: (error) => {
          if (error) {
            finish(reject, new Error(parseMpError(error)))
            return
          }
          fillBridgeForm(card, detected)
          window.setTimeout(requestToken, 400)
        },
        onPaymentMethodsReceived: () => {
          requestToken()
        },
        onCardTokenReceived: (error, data) => {
          if (error) {
            finish(reject, new Error(parseMpError(error)))
            return
          }
          const formData = cardForm?.getCardFormData?.() || {}
          const token = String(data?.token || formData.token || '')
          if (!token) {
            finish(reject, new Error('Mercado Pago não retornou token do cartão.'))
            return
          }
          finish(resolve, {
            token,
            paymentMethodId: String(formData.paymentMethodId || detected.paymentMethodId || ''),
            issuerId: String(formData.issuerId || detected.issuerId || ''),
            installments: Number(formData.installments) || 1,
          })
        },
        onError: (error) => {
          finish(reject, new Error(parseMpError(error)))
        },
      },
    })
  })
}
