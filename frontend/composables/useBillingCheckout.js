import { createMercadoPagoCardToken } from '~/utils/mercadopago-card-token'
import { authFetchInit } from '~/composables/useAuthSession.js'

export function useBillingCheckout() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase
  const { authFetchInit } = usePatientAuth()

  const billingConfig = ref(null)
  const subscription = ref(null)
  const loading = ref(false)
  const error = ref('')

  async function fetchConfig() {
    loading.value = true
    error.value = ''
    try {
      billingConfig.value = await $fetch(`${apiBase}/billing/config`, authFetchInit())
      return billingConfig.value
    } catch (err) {
      error.value = err?.data?.message || 'Não foi possível carregar os planos.'
      billingConfig.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchMySubscription() {
    try {
      subscription.value = await $fetch(`${apiBase}/billing/subscription/me`, authFetchInit())
      return subscription.value
    } catch {
      subscription.value = null
      return null
    }
  }

  async function subscribeWithCard(payload) {
    return $fetch(`${apiBase}/billing/subscribe/card`, authFetchInit({
      method: 'POST',
      body: payload,
    }))
  }

  /** Gera card_token no browser (public_key) e envia só o token ao backend. */
  async function subscribeWithCardForm({ publicKey, planId, card, payerEmail, payerName, amount }) {
    if (!publicKey) {
      throw Object.assign(new Error('Chave pública do Mercado Pago ausente.'), { data: { message: 'Checkout indisponível.' } })
    }

    const cardToken = await createMercadoPagoCardToken(publicKey, card, amount)
    return subscribeWithCard({
      planId,
      cardToken,
      payerEmail,
      payerName: payerName || card.cardholderName,
      identification: card.identification || {
        type: 'CPF',
        number: card.identificationNumber,
      },
    })
  }

  async function subscribeWithPix(payload) {
    return $fetch(`${apiBase}/billing/subscribe/pix`, authFetchInit({
      method: 'POST',
      body: payload,
    }))
  }

  return {
    billingConfig,
    subscription,
    loading,
    error,
    fetchConfig,
    fetchMySubscription,
    subscribeWithCard,
    subscribeWithCardForm,
    subscribeWithPix,
  }
}

export function useBillingAdmin() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase

  function billingAdminError(err, fallback) {
    const status = err?.statusCode ?? err?.status ?? err?.response?.status
    if (status === 404) {
      return 'Rotas de billing não encontradas no servidor. Faça redeploy do backend (apiclube) com a versão mais recente.'
    }
    return err?.data?.message || fallback
  }

  async function fetchAdminProducts() {
    try {
      return await $fetch(`${apiBase}/billing/admin/products`, authFetchInit())
    } catch (err) {
      throw Object.assign(err, { data: { message: billingAdminError(err, 'Não foi possível carregar os produtos.') } })
    }
  }

  async function updateAdminProducts(products) {
    try {
      return await $fetch(`${apiBase}/billing/admin/products`, authFetchInit({
        method: 'PUT',
        body: { products },
      }))
    } catch (err) {
      throw Object.assign(err, { data: { message: billingAdminError(err, 'Não foi possível salvar os produtos.') } })
    }
  }

  async function fetchAdminPlans() {
    try {
      return await $fetch(`${apiBase}/billing/admin/plans`, authFetchInit())
    } catch (err) {
      throw Object.assign(err, { data: { message: billingAdminError(err, 'Não foi possível carregar os preços.') } })
    }
  }

  async function updateAdminPlans(plans) {
    try {
      return await $fetch(`${apiBase}/billing/admin/plans`, authFetchInit({
        method: 'PUT',
        body: { plans },
      }))
    } catch (err) {
      throw Object.assign(err, { data: { message: billingAdminError(err, 'Não foi possível salvar os preços.') } })
    }
  }

  async function fetchFinancialSummary() {
    try {
      return await $fetch(`${apiBase}/billing/admin/summary`, authFetchInit())
    } catch (err) {
      throw Object.assign(err, { data: { message: billingAdminError(err, 'Não foi possível carregar o resumo financeiro.') } })
    }
  }

  async function fetchBillingNotificationLogs(limit = 80) {
    try {
      return await $fetch(`${apiBase}/billing/admin/notification-logs`, authFetchInit({
        query: { limit },
      }))
    } catch (err) {
      throw Object.assign(err, { data: { message: billingAdminError(err, 'Não foi possível carregar os logs.') } })
    }
  }

  return {
    fetchAdminProducts,
    updateAdminProducts,
    fetchAdminPlans,
    updateAdminPlans,
    fetchFinancialSummary,
    fetchBillingNotificationLogs,
  }
}
