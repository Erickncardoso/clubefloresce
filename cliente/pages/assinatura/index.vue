<template>
  <div class="patient-page assinatura-page patient-page--no-tab">
    <PatientHeader
      title="Assinatura"
      :show-back="!needsFirstPayment"
      :back-to="needsFirstPayment ? undefined : '/perfil'"
      :show-bell="false"
    />

    <PatientPageSkeleton v-if="pageLoading" layout="profile" />

    <div v-else class="checkout-shell">
      <section class="checkout-hero">
        <div class="checkout-hero-badge" aria-hidden="true">
          <Sparkles class="checkout-hero-badge-icon" />
        </div>
        <p class="checkout-hero-eyebrow">Clube Florescer</p>
        <h1 class="checkout-hero-title">
          {{ needsFirstPayment ? 'Finalize sua assinatura' : 'Renovar assinatura' }}
        </h1>
        <p class="checkout-hero-sub">
          {{ needsFirstPayment
            ? 'Último passo para liberar dieta, Bella IA e check-ins no app.'
            : 'Mantenha seu acesso sem interrupção.' }}
        </p>
        <ul v-if="needsFirstPayment" class="checkout-benefits">
          <li><Salad class="checkout-benefit-icon" /> Dieta personalizada</li>
          <li><Sparkles class="checkout-benefit-icon" /> Bella IA</li>
          <li><CalendarCheck class="checkout-benefit-icon" /> Check-ins</li>
        </ul>
      </section>

      <section v-if="accessExpired" class="checkout-banner checkout-banner--alert cf-squircle cf-squircle--control" role="alert">
        <AlertCircle class="checkout-banner-icon" />
        <div>
          <strong>Seu acesso expirou</strong>
          <p>Renove sua assinatura para continuar usando o Clube Florescer.</p>
        </div>
      </section>

      <section v-else-if="currentPlan !== 'FREE'" class="checkout-banner checkout-banner--status cf-squircle cf-squircle--control">
        <CheckCircle2 class="checkout-banner-icon checkout-banner-icon--ok" />
        <div>
          <strong>Plano {{ planLabel(currentPlan) }}</strong>
          <p v-if="accessExpiresAt">Acesso até {{ formatDate(accessExpiresAt) }}</p>
          <p v-else>Assinatura ativa</p>
        </div>
      </section>

      <p v-if="checkoutError" class="checkout-error cf-squircle cf-squircle--control" role="alert">{{ checkoutError }}</p>

      <section v-if="configLoadFailed" class="checkout-empty cf-squircle cf-squircle--surface">
        <CreditCard class="checkout-empty-icon" />
        <h2>Não foi possível carregar o checkout</h2>
        <p>{{ checkoutError || 'Verifique sua conexão e tente novamente.' }}</p>
        <button type="button" class="btn-auth-submit patient-auth-submit cf-squircle--control" @click="reloadBilling">
          Tentar novamente
        </button>
      </section>

      <section v-else-if="billingConfig && !billingConfig.enabled" class="checkout-empty cf-squircle cf-squircle--surface">
        <CreditCard class="checkout-empty-icon" />
        <h2>Pagamentos em configuração</h2>
        <p>A nutricionista ainda está configurando os pagamentos. Tente novamente em breve.</p>
      </section>

      <template v-else-if="billingConfig?.enabled">
        <section class="checkout-section">
          <h2 class="checkout-section-title">Escolha seu plano</h2>
          <div class="checkout-plan-list" :class="{ 'checkout-plan-list--single': plans.length === 1 }">
            <button
              v-for="plan in plans"
              :key="plan.id"
              type="button"
              class="checkout-plan-card cf-squircle cf-squircle--surface"
              :class="{ 'checkout-plan-card--active': selectedPlanId === plan.id }"
              @click="selectPlan(plan.id)"
            >
              <span v-if="selectedPlanId === plan.id" class="checkout-plan-check" aria-hidden="true">
                <CheckCircle2 />
              </span>
              <span class="checkout-plan-name">{{ plan.label }}</span>
              <span class="checkout-plan-price">
                {{ formatCurrency(plan.monthlyAmount) }}
                <small>{{ plan.priceSuffix || '/mês' }}</small>
              </span>
              <span class="checkout-plan-desc">{{ plan.description }}</span>
            </button>
          </div>
        </section>

        <section class="checkout-payment cf-squircle cf-squircle--surface">
          <div class="checkout-tabs cf-squircle--control" role="tablist" aria-label="Forma de pagamento">
            <button
              type="button"
              role="tab"
              class="checkout-tab cf-squircle--control"
              :class="{ 'checkout-tab--active': paymentMethod === 'card' }"
              :aria-selected="paymentMethod === 'card'"
              @click="setPaymentMethod('card')"
            >
              <CreditCard class="checkout-tab-icon" />
              Cartão
            </button>
            <button
              type="button"
              role="tab"
              class="checkout-tab cf-squircle--control"
              :class="{ 'checkout-tab--active': paymentMethod === 'pix' }"
              :aria-selected="paymentMethod === 'pix'"
              @click="setPaymentMethod('pix')"
            >
              <QrCode class="checkout-tab-icon" />
              Pix
            </button>
          </div>

          <div v-if="checkoutStep === 'pix-waiting' && pixRecurringAutomatic" class="checkout-pix checkout-pix--automatic">
            <h3>Pix Automático</h3>
            <p class="checkout-pix-recurring">
              Assinatura recorrente de <strong>{{ formatCurrency(selectedPlanAmount) }}/mês</strong>.
              Autorize no Mercado Pago — no app do banco aparece como <strong>Pix Automático</strong>.
            </p>
            <p class="checkout-pix-amount">{{ formatCurrency(selectedPlanAmount) }}</p>
            <p v-if="redirectingPix" class="checkout-pix-redirect">
              Redirecionando para o Mercado Pago…
            </p>
            <button
              type="button"
              class="btn-auth-submit patient-auth-submit cf-squircle--control checkout-pix-open-btn"
              @click="openPixAutomaticCheckout"
            >
              Autorizar Pix Automático
            </button>
            <p class="checkout-pix-hint">
              Você será levada ao Mercado Pago para escolher Pix e autorizar no app do banco.
              As próximas mensalidades serão debitadas automaticamente.
            </p>
            <button type="button" class="checkout-btn checkout-btn--ghost" :disabled="pollingPix" @click="refreshSubscription">
              {{ pollingPix ? 'Verificando…' : 'Já autorizei — verificar' }}
            </button>
          </div>

          <div v-else-if="checkoutStep === 'pix-waiting'" class="checkout-pix checkout-pix--fallback">
            <h3>Pague com Pix</h3>
            <p class="checkout-pix-recurring">
              Pagamento da <strong>1ª mensalidade</strong> de <strong>{{ formatCurrency(selectedPlanAmount) }}</strong>.
              <span v-if="pixRecurringFallback"> Pix Automático indisponível — use o código abaixo.</span>
            </p>
            <p class="checkout-pix-amount">{{ formatCurrency(selectedPlanAmount) }}</p>
            <img
              v-if="pixData.qrCodeBase64"
              :src="`data:image/png;base64,${pixData.qrCodeBase64}`"
              alt="QR Code Pix"
              class="checkout-pix-qr"
            />
            <div v-if="pixCopyCode" class="checkout-pix-copy">
              <label class="checkout-pix-copy-label" for="cf-pix-copy-code">Pix copia e cola</label>
              <textarea
                id="cf-pix-copy-code"
                readonly
                class="checkout-pix-copy-code cf-squircle--control"
                :value="pixCopyCode"
                rows="4"
                @focus="selectPixCopyCode"
              />
              <button
                type="button"
                class="btn-auth-submit patient-auth-submit cf-squircle--control checkout-pix-copy-btn"
                @click="copyPixCode"
              >
                {{ pixCopied ? 'Copiado!' : 'Copiar Pix copia e cola' }}
              </button>
            </div>
            <p v-if="billingConfig?.testMode" class="checkout-sandbox-note">
              Modo teste: o Pix será aprovado automaticamente em alguns segundos.
            </p>
            <a
              v-if="pixData.ticketUrl"
              :href="pixData.ticketUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="checkout-sandbox-link"
            >
              Abrir link de teste
            </a>
            <p class="checkout-pix-hint">
              Este Pix é avulso (pagamento único). Após pagar, a liberação é automática em alguns segundos.
            </p>
            <button type="button" class="checkout-btn checkout-btn--ghost" :disabled="pollingPix" @click="refreshSubscription">
              {{ pollingPix ? 'Verificando…' : 'Já paguei — verificar' }}
            </button>
          </div>

          <div v-else-if="paymentMethod === 'card'" class="checkout-card">
            <p class="checkout-card-hint">
              Cobrança mensal recorrente de <strong>{{ formatCurrency(selectedPlanAmount) }}</strong> no cartão.
            </p>

            <details v-if="billingConfig?.testMode" class="checkout-sandbox cf-squircle cf-squircle--control">
              <summary>Cartão de teste (sandbox)</summary>
              <p>5031 4332 1540 6351 · CVV 123 · 11/30</p>
              <p>Titular: <strong>APRO</strong> · CPF: 12345678909</p>
              <p v-if="billingConfig?.sandboxSimulateCard">Simulação local ativa — sem cobrança real.</p>
            </details>

            <div v-if="payerEmail" class="checkout-account cf-squircle cf-squircle--control">
              <span class="checkout-account-label">Conta</span>
              <strong>{{ payerName }}</strong>
              <span>{{ payerEmail }}</span>
            </div>

            <form class="checkout-form checkout-float-fields patient-auth-form" @submit.prevent="submitCardCheckout">
              <div
                class="form-group field--float"
                :class="{ focused: focusedField === 'name' }"
              >
                <label for="cf-cardholder-name">
                  {{ billingConfig?.testMode ? 'Nome no cartão' : 'Nome do titular' }}
                </label>
                <div class="input-wrapper cf-squircle--control">
                  <input
                    id="cf-cardholder-name"
                    v-model="cardForm.cardholderName"
                    type="text"
                    autocomplete="cc-name"
                    required
                    @focus="focusedField = 'name'"
                    @blur="focusedField = ''"
                  >
                </div>
              </div>

              <div
                class="form-group field--float"
                :class="{ focused: focusedField === 'number' }"
              >
                <label for="cf-card-number">Número do cartão</label>
                <div class="input-wrapper cf-squircle--control">
                  <input
                    id="cf-card-number"
                    :value="cardNumberDisplay"
                    type="text"
                    inputmode="numeric"
                    autocomplete="cc-number"
                    placeholder="0000 0000 0000 0000"
                    required
                    @input="onCardNumberInput"
                    @focus="focusedField = 'number'"
                    @blur="focusedField = ''"
                  >
                </div>
              </div>

              <div class="checkout-field-row">
                <div
                  class="form-group field--float"
                  :class="{ focused: focusedField === 'expiry' }"
                >
                  <label for="cf-expiration-date">Validade</label>
                  <div class="input-wrapper cf-squircle--control">
                    <input
                      id="cf-expiration-date"
                      :value="cardExpiryDisplay"
                      type="text"
                      inputmode="numeric"
                      autocomplete="cc-exp"
                      placeholder="MM/AA"
                      required
                      @input="onCardExpiryInput"
                      @focus="focusedField = 'expiry'"
                      @blur="focusedField = ''"
                    >
                  </div>
                </div>

                <div
                  class="form-group field--float"
                  :class="{ focused: focusedField === 'cvv' }"
                >
                  <label for="cf-security-code">CVV</label>
                  <div class="input-wrapper cf-squircle--control">
                    <input
                      id="cf-security-code"
                      :value="cardCvvDisplay"
                      type="text"
                      inputmode="numeric"
                      autocomplete="cc-csc"
                      placeholder="123"
                      maxlength="4"
                      required
                      @input="onCardCvvInput"
                      @focus="focusedField = 'cvv'"
                      @blur="focusedField = ''"
                    >
                  </div>
                </div>
              </div>

              <div
                class="form-group field--float"
                :class="{ focused: focusedField === 'cpf' }"
              >
                <label for="cf-id-number">CPF</label>
                <div class="input-wrapper cf-squircle--control">
                  <input
                    id="cf-id-number"
                    :value="cardCpfDisplay"
                    type="text"
                    inputmode="numeric"
                    placeholder="000.000.000-00"
                    required
                    @input="onCardCpfInput"
                    @focus="focusedField = 'cpf'"
                    @blur="focusedField = ''"
                  >
                </div>
              </div>

              <button
                type="submit"
                class="btn-auth-submit patient-auth-submit cf-squircle--control"
                :disabled="processing"
              >
                {{ processing ? 'Processando…' : `Assinar por ${formatCurrency(selectedPlanAmount)}/mês` }}
              </button>
            </form>
          </div>

          <div v-else class="checkout-pix-start">
            <p class="checkout-pix-start-lead">
              Assinatura recorrente de <strong>{{ formatCurrency(selectedPlanAmount) }}/mês</strong> via <strong>Pix Automático</strong>.
            </p>
            <p class="checkout-pix-start-note">
              Informe seu CPF e continue no Mercado Pago para autorizar no app do banco. As mensalidades seguintes são debitadas automaticamente.
            </p>
            <form class="checkout-form checkout-float-fields patient-auth-form" @submit.prevent="startPixCheckout">
              <div
                class="form-group field--float"
                :class="{ focused: focusedField === 'pix-cpf' }"
              >
                <label for="cf-pix-cpf">CPF</label>
                <div class="input-wrapper cf-squircle--control">
                  <input
                    id="cf-pix-cpf"
                    :value="pixCpfDisplay"
                    type="text"
                    inputmode="numeric"
                    placeholder="000.000.000-00"
                    required
                    @input="onPixCpfInput"
                    @focus="focusedField = 'pix-cpf'"
                    @blur="focusedField = ''"
                  >
                </div>
              </div>
              <button
                type="submit"
                class="btn-auth-submit patient-auth-submit cf-squircle--control"
                :disabled="processing"
              >
                {{ processing ? 'Abrindo Mercado Pago…' : `Autorizar Pix Automático — ${formatCurrency(selectedPlanAmount)}/mês` }}
              </button>
            </form>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup>
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  QrCode,
  Salad,
  Sparkles,
} from 'lucide-vue-next'
import { isPatientAccessExpired, isPatientPaidAccessActive } from '~/utils/patient-access'
import {
  maskCardExpiry,
  maskCardNumber,
  maskCpf,
  maskCvv,
  onlyDigits,
} from '~/utils/card-input-masks'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const { userFullName, syncPatientProfile } = usePatientApp()
const { verifiedUser, verifyAuthSession } = useAuthSession()
const {
  billingConfig,
  subscription,
  error: checkoutError,
  fetchConfig,
  fetchMySubscription,
  subscribeWithCardForm,
  subscribeWithPix,
} = useBillingCheckout()

const route = useRoute()

const pageLoading = ref(true)
const configLoadFailed = ref(false)
const selectedPlanId = ref('PREMIUM')
const paymentMethod = ref('card')
const checkoutStep = ref('idle')
const processing = ref(false)
const pixData = ref({ qrCode: '', qrCodeBase64: '', ticketUrl: '', expiresAt: null })
const pixInitPoint = ref('')
const pixRecurringAutomatic = ref(false)
const pixRecurringFallback = ref(false)
const redirectingPix = ref(false)
const pixCopied = ref(false)
const pollingPix = ref(false)
const focusedField = ref('')

const cardForm = ref({
  cardholderName: '',
  cardNumber: '',
  expirationDate: '',
  securityCode: '',
  identificationNumber: '',
})

const SANDBOX_CARD_DEFAULTS = {
  cardholderName: 'APRO',
  cardNumber: '5031433215406351',
  expirationDate: '11/30',
  securityCode: '123',
  identificationNumber: '12345678909',
}

const cardNumberDisplay = computed(() => maskCardNumber(cardForm.value.cardNumber))
const cardExpiryDisplay = computed(() => maskCardExpiry(cardForm.value.expirationDate))
const cardCpfDisplay = computed(() => maskCpf(cardForm.value.identificationNumber))
const pixCpfDisplay = computed(() => maskCpf(cardForm.value.identificationNumber))
const cardCvvDisplay = computed(() => maskCvv(cardForm.value.securityCode))

function onCardNumberInput(event) {
  const digits = onlyDigits(event.target.value, 16)
  cardForm.value.cardNumber = digits
  event.target.value = maskCardNumber(digits)
}

function onCardExpiryInput(event) {
  const masked = maskCardExpiry(onlyDigits(event.target.value, 4))
  cardForm.value.expirationDate = masked
  event.target.value = masked
}

function onCardCpfInput(event) {
  const digits = onlyDigits(event.target.value, 11)
  cardForm.value.identificationNumber = digits
  event.target.value = maskCpf(digits)
}

function onPixCpfInput(event) {
  onCardCpfInput(event)
}

function onCardCvvInput(event) {
  const digits = maskCvv(event.target.value)
  cardForm.value.securityCode = digits
  event.target.value = digits
}

const plans = computed(() => billingConfig.value?.plans || [])
const payerEmail = computed(() => String(billingConfig.value?.payer?.email || '').trim())
const payerName = computed(() => {
  const fromBilling = String(billingConfig.value?.payer?.name || '').trim()
  if (fromBilling) return fromBilling
  return String(userFullName() || '').trim()
})
const sessionMismatch = computed(() => {
  const payerId = billingConfig.value?.payer?.id
  const sessionId = verifiedUser.value?.id
  if (!payerId || !sessionId) return false
  return payerId !== sessionId
})
const currentPlan = computed(() => subscription.value?.userPlan || 'FREE')
const accessExpiresAt = computed(() => subscription.value?.accessExpiresAt || null)
const accessExpired = computed(() => isPatientAccessExpired(accessExpiresAt.value))
const needsFirstPayment = computed(() => !isPatientPaidAccessActive(
  currentPlan.value,
  accessExpiresAt.value,
  verifiedUser.value?.approvalEmailSentAt,
))

const selectedPlan = computed(() => (
  plans.value.find((plan) => plan.id === selectedPlanId.value) || plans.value[0]
))
const selectedPlanAmount = computed(() => selectedPlan.value?.monthlyAmount || 0)

const pixCopyCode = computed(() => String(pixData.value.qrCode || '').trim())

function normalizePixPayload(pix) {
  if (!pix || typeof pix !== 'object') {
    return { qrCode: '', qrCodeBase64: '', ticketUrl: '', expiresAt: null }
  }
  return {
    qrCode: String(pix.qrCode || pix.qr_code || '').trim(),
    qrCodeBase64: pix.qrCodeBase64 || pix.qr_code_base64 || '',
    ticketUrl: pix.ticketUrl || pix.ticket_url || '',
    expiresAt: pix.expiresAt || pix.expires_at || null,
  }
}

function selectPixCopyCode(event) {
  event.target?.select?.()
}

watch(checkoutError, (value) => {
  if (value) processing.value = false
})

onMounted(async () => {
  pageLoading.value = true
  await loadBillingData()
})

function syncCardFormFromSession() {
  if (billingConfig.value?.testMode) {
    cardForm.value.cardholderName = SANDBOX_CARD_DEFAULTS.cardholderName
    cardForm.value.cardNumber = SANDBOX_CARD_DEFAULTS.cardNumber
    cardForm.value.expirationDate = SANDBOX_CARD_DEFAULTS.expirationDate
    cardForm.value.securityCode = SANDBOX_CARD_DEFAULTS.securityCode
    cardForm.value.identificationNumber = SANDBOX_CARD_DEFAULTS.identificationNumber
    return
  }

  if (!cardForm.value.cardholderName) {
    cardForm.value.cardholderName = payerName.value
  }
}

async function loadBillingData() {
  configLoadFailed.value = false
  checkoutError.value = ''
  await Promise.all([
    verifyAuthSession({ requiredRole: 'PACIENTE', force: true }),
    syncPatientProfile(),
  ])
  await Promise.all([fetchConfig(), fetchMySubscription()])

  if (sessionMismatch.value) {
    await verifyAuthSession({ requiredRole: 'PACIENTE', force: true })
    await fetchConfig()
  }

  if (sessionMismatch.value) {
    configLoadFailed.value = true
    checkoutError.value = 'Sessão de outro usuário detectada. Saia e entre novamente com paciente@florescer.com.'
  }

  configLoadFailed.value = configLoadFailed.value || !billingConfig.value
  if (plans.value.length) {
    selectedPlanId.value = plans.value[0].id
  }
  pageLoading.value = false

  if (route.query.status === 'success') {
    await completeCheckoutSuccess()
  } else {
    syncCardFormFromSession()
  }
}

async function completeCheckoutSuccess() {
  await fetchMySubscription()
  await verifyAuthSession({ requiredRole: 'PACIENTE', force: true })
  await navigateTo('/assinatura/obrigado', { replace: true })
}

async function reloadBilling() {
  pageLoading.value = true
  checkoutStep.value = 'idle'
  await loadBillingData()
}

let pixPollTimer = null

function stopPixPolling() {
  if (pixPollTimer) {
    clearInterval(pixPollTimer)
    pixPollTimer = null
  }
}

function startPixPolling() {
  stopPixPolling()
  let attempts = 0
  pixPollTimer = setInterval(async () => {
    attempts += 1
    if (attempts > 20 || checkoutStep.value === 'success') {
      stopPixPolling()
      return
    }
    await refreshSubscription()
    if (checkoutStep.value === 'success') stopPixPolling()
  }, 3000)
}

onBeforeUnmount(() => {
  stopPixPolling()
})

function planLabel(plan) {
  const fromCatalog = plans.value.find((item) => item.id === plan || item.accessPlan === plan)
  if (fromCatalog?.label) return fromCatalog.label
  if (plan === 'PLATINUM') return 'Completo'
  if (plan === 'PREMIUM') return 'Essencial'
  return 'Gratuito'
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('pt-BR')
}

async function selectPlan(planId) {
  if (selectedPlanId.value === planId) return
  selectedPlanId.value = planId
  checkoutStep.value = 'idle'
}

async function setPaymentMethod(method) {
  if (paymentMethod.value === method) return
  paymentMethod.value = method
  checkoutStep.value = 'idle'
  checkoutError.value = ''
  pixRecurringAutomatic.value = false
  pixRecurringFallback.value = false
  pixInitPoint.value = ''
  redirectingPix.value = false
  stopPixPolling()
}

async function submitCardCheckout() {
  processing.value = true
  checkoutError.value = ''
  try {
    const result = await subscribeWithCardForm({
      publicKey: billingConfig.value?.publicKey,
      planId: selectedPlanId.value,
      amount: selectedPlanAmount.value,
      payerEmail: payerEmail.value,
      payerName: payerName.value || cardForm.value.cardholderName,
      card: {
        cardNumber: onlyDigits(cardForm.value.cardNumber, 16),
        expirationDate: cardExpiryDisplay.value,
        securityCode: onlyDigits(cardForm.value.securityCode, 4),
        cardholderName: cardForm.value.cardholderName,
        identificationNumber: onlyDigits(cardForm.value.identificationNumber, 11),
      },
    })

    if (result?.status === 'authorized') {
      await completeCheckoutSuccess()
    } else {
      checkoutError.value = 'Pagamento pendente. Aguarde a confirmação ou tente novamente.'
    }
  } catch (err) {
    checkoutError.value = err?.data?.message || err?.message || 'Não foi possível processar o cartão. Verifique os dados e tente novamente.'
  } finally {
    processing.value = false
  }
}

async function startPixCheckout() {
  processing.value = true
  checkoutError.value = ''
  redirectingPix.value = false
  const cpf = onlyDigits(cardForm.value.identificationNumber, 11)
  if (!billingConfig.value?.testMode && cpf.length !== 11) {
    checkoutError.value = 'Informe um CPF válido para continuar.'
    processing.value = false
    return
  }
  try {
    const result = await subscribeWithPix({
      planId: selectedPlanId.value,
      payerEmail: payerEmail.value,
      payerName: payerName.value || userFullName(),
      identification: {
        type: 'CPF',
        number: cpf,
      },
    })

    pixInitPoint.value = result?.initPoint || ''
    pixRecurringAutomatic.value = Boolean(
      result?.isRecurring && result?.initPoint && !result?.recurringFallback,
    )
    pixRecurringFallback.value = Boolean(result?.recurringFallback)
    pixData.value = normalizePixPayload(result?.pix)
    checkoutStep.value = 'pix-waiting'
    startPixPolling()

    if (pixRecurringAutomatic.value) {
      openPixAutomaticCheckout()
    }
  } catch (err) {
    checkoutError.value = err?.data?.message || 'Não foi possível iniciar o Pix Automático.'
  } finally {
    processing.value = false
  }
}

function openPixAutomaticCheckout() {
  const url = pixInitPoint.value
  if (!url || typeof window === 'undefined') return
  redirectingPix.value = true
  window.location.assign(url)
}

async function copyPixCode() {
  const code = pixCopyCode.value
  if (!code) return

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(code)
    } else {
      const el = document.getElementById('cf-pix-copy-code')
      if (el instanceof HTMLTextAreaElement) {
        el.focus()
        el.select()
        document.execCommand('copy')
      } else {
        throw new Error('clipboard unavailable')
      }
    }
    pixCopied.value = true
    setTimeout(() => { pixCopied.value = false }, 2500)
  } catch {
    checkoutError.value = 'Não foi possível copiar o código Pix. Selecione o texto acima e copie manualmente.'
  }
}

async function refreshSubscription() {
  pollingPix.value = true
  try {
    const data = await fetchMySubscription()
    if (data?.userPlan && isPatientPaidAccessActive(
      data.userPlan,
      data.accessExpiresAt,
      verifiedUser.value?.approvalEmailSentAt,
    )) {
      await completeCheckoutSuccess()
    }
  } finally {
    pollingPix.value = false
  }
}
</script>

<style scoped>
.patient-page.assinatura-page {
  --checkout-gutter: max(1.25rem, env(safe-area-inset-left, 0px));
  --checkout-radius-surface: var(--cf-radius-surface, 1.875rem);
  --checkout-radius-control: var(--cf-radius-control, 1.625rem);
  --checkout-radius-inner: var(--cf-radius-md, 1.25rem);
  padding:
    0
    max(1.25rem, env(safe-area-inset-right, 0px))
    calc(2.5rem + env(safe-area-inset-bottom, 0px))
    max(1.25rem, env(safe-area-inset-left, 0px)) !important;
  min-height: 100dvh;
  min-width: 0;
  overflow-x: hidden;
  box-sizing: border-box;
  background:
    radial-gradient(ellipse 120% 80% at 50% -20%, rgba(139, 150, 124, 0.18), transparent 55%),
    linear-gradient(180deg, #eef0eb 0%, #f7f8f5 28%, var(--cf-bg, #fff) 62%);
}

.patient-page.assinatura-page :deep(.cf-header) {
  margin-inline: calc(-1 * var(--checkout-gutter));
  padding-inline: var(--checkout-gutter);
}

.checkout-shell {
  width: 100%;
  max-width: 28rem;
  margin: 0 auto;
  min-width: 0;
  padding-inline: 0;
  padding-bottom: 0;
  box-sizing: border-box;
}

.checkout-hero {
  text-align: center;
  padding: 0.35rem 0 1.15rem;
}

.checkout-hero-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  margin-bottom: 0.65rem;
  border-radius: 999px;
  background: rgba(139, 150, 124, 0.14);
  color: var(--cf-green-dark, #6f7863);
}

.checkout-hero-badge-icon {
  width: 1.35rem;
  height: 1.35rem;
}

.checkout-hero-eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--cf-green-dark, #6f7863);
}

.checkout-hero-title {
  margin: 0 0 0.45rem;
  font-size: clamp(1.25rem, 4.5vw, 1.5rem);
  font-weight: 800;
  line-height: 1.2;
  color: var(--cf-text, #141414);
}

.checkout-hero-sub {
  margin: 0 auto;
  max-width: 22rem;
  font-size: 0.88rem;
  line-height: 1.5;
  color: var(--cf-text-muted, #525252);
}

.checkout-benefits {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.45rem;
  margin: 0.95rem 0 0;
  padding: 0;
  list-style: none;
}

.checkout-benefits li {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.38rem 0.65rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(139, 150, 124, 0.2);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--cf-green-dark, #6f7863);
}

.checkout-benefit-icon {
  width: 0.9rem;
  height: 0.9rem;
  flex-shrink: 0;
}

.checkout-banner {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.9rem 1rem;
  margin-bottom: 1rem;
  border-radius: var(--cf-squircle-r, var(--checkout-radius-control));
  background: var(--cf-surface, #fff);
  box-shadow: 0 6px 20px rgba(20, 20, 20, 0.05);
}

.checkout-banner--alert {
  border: 1px solid rgba(214, 69, 69, 0.22);
}

.checkout-banner-icon {
  width: 1.2rem;
  height: 1.2rem;
  color: #d64545;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.checkout-banner-icon--ok {
  color: var(--cf-green, #8b967c);
}

.checkout-banner strong {
  display: block;
  font-size: 0.9rem;
  color: var(--cf-text);
}

.checkout-banner p {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--cf-text-muted);
}

.checkout-error {
  margin: 0 0 1rem;
  padding: 0.75rem 0.9rem;
  border-radius: var(--cf-squircle-r, var(--checkout-radius-control));
  background: rgba(214, 69, 69, 0.08);
  color: #c73a3a;
  font-size: 0.82rem;
  line-height: 1.4;
}

.checkout-empty {
  text-align: center;
  padding: 2rem 1.15rem;
  margin-bottom: 1rem;
}

.checkout-empty-icon {
  width: 2rem;
  height: 2rem;
  color: var(--cf-text-muted);
  margin-bottom: 0.75rem;
}

.checkout-empty h2 {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
}

.checkout-empty p {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
}

.checkout-section {
  margin-bottom: 1rem;
}

.checkout-section-title {
  margin: 0 0 0.65rem;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--cf-text);
}

.checkout-plan-list {
  display: grid;
  gap: 0.65rem;
}

.checkout-plan-list--single {
  grid-template-columns: 1fr;
}

@media (min-width: 480px) {
  .checkout-plan-list:not(.checkout-plan-list--single) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.checkout-plan-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  width: 100%;
  padding: 1rem 1rem 1.05rem;
  border: 2px solid transparent;
  border-radius: var(--cf-squircle-r, var(--checkout-radius-surface));
  background: var(--cf-surface, #fff);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.12s ease;
  box-shadow: 0 8px 22px rgba(20, 20, 20, 0.06);
  overflow: hidden;
}

.checkout-plan-card:active {
  transform: scale(0.99);
}

.checkout-plan-card--active {
  border-color: var(--cf-green, #8b967c);
  box-shadow: 0 10px 26px rgba(111, 120, 99, 0.18);
}

.checkout-plan-check {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  color: var(--cf-green, #8b967c);
}

.checkout-plan-check :deep(svg) {
  width: 1.1rem;
  height: 1.1rem;
}

.checkout-plan-name {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--cf-text);
  padding-right: 1.5rem;
}

.checkout-plan-price {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--cf-green-dark, #6f7863);
  line-height: 1.1;
}

.checkout-plan-price small {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--cf-text-muted);
}

.checkout-plan-desc {
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--cf-text-muted);
}

.checkout-payment {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  padding: 1.15rem;
  border-radius: var(--cf-squircle-r, var(--checkout-radius-surface));
  background: var(--cf-surface, #fff);
  box-shadow: 0 10px 28px rgba(20, 20, 20, 0.07);
  box-sizing: border-box;
  overflow: hidden;
}

.checkout-card,
.checkout-pix,
.checkout-pix-start {
  width: 100%;
  min-width: 0;
  flex-shrink: 0;
}

.checkout-card {
  display: flex;
  flex-direction: column;
}

.checkout-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
  width: 100%;
  flex-shrink: 0;
  padding: 0.28rem;
  margin-bottom: 1rem;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-squircle-r, var(--checkout-radius-control));
  background: rgba(0, 0, 0, 0.02);
  box-sizing: border-box;
}

.checkout-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: none;
  border-radius: calc(var(--cf-squircle-r, var(--checkout-radius-control)) - 0.35rem);
  padding: 0.58rem 0.65rem;
  font-size: 0.84rem;
  font-weight: 600;
  font-family: inherit;
  background: transparent;
  color: var(--cf-text-muted);
  cursor: pointer;
  min-height: 2.75rem;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.checkout-tab-icon {
  width: 1rem;
  height: 1rem;
}

.checkout-tab--active {
  background: #fff;
  color: var(--cf-text);
  box-shadow: 0 2px 8px rgba(20, 20, 20, 0.06);
}

.checkout-card-hint,
.checkout-pix-recurring,
.checkout-pix-start-lead {
  margin: 0 0 0.85rem;
  font-size: 0.84rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
}

.checkout-card-hint strong,
.checkout-pix-recurring strong,
.checkout-pix-start-lead strong {
  color: var(--cf-text);
}

.checkout-sandbox {
  margin: 0 0 0.85rem;
  padding: 0.65rem 0.75rem;
  border-radius: var(--cf-squircle-r, var(--checkout-radius-control));
  background: rgba(193, 123, 128, 0.1);
  font-size: 0.74rem;
  line-height: 1.45;
  color: var(--cf-text);
}

.checkout-sandbox summary {
  cursor: pointer;
  font-weight: 700;
  list-style: none;
}

.checkout-sandbox summary::-webkit-details-marker {
  display: none;
}

.checkout-sandbox p {
  margin: 0.35rem 0 0;
}

.checkout-account {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  margin-bottom: 0.9rem;
  padding: 0.7rem 0.85rem;
  border-radius: var(--cf-squircle-r, var(--checkout-radius-control));
  background: rgba(139, 150, 124, 0.1);
  font-size: 0.78rem;
  line-height: 1.35;
  color: var(--cf-text-muted);
}

.checkout-account-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--cf-green-dark, #6f7863);
}

.checkout-account strong {
  font-size: 0.86rem;
  color: var(--cf-text);
}

.checkout-card .checkout-form.patient-auth-form {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  gap: 1.15rem;
  margin-top: 0.15rem;
}

.checkout-float-fields .form-group.field--float {
  position: relative;
  width: 100%;
  min-width: 0;
  margin-top: 0.35rem;
}

.checkout-float-fields .form-group.field--float > label {
  position: absolute;
  top: -0.58rem;
  left: 0.78rem;
  margin: 0;
  padding: 0 0.4rem;
  background: #fff;
  box-shadow:
    -6px 0 0 #fff,
    6px 0 0 #fff;
  z-index: 2;
  max-width: calc(100% - 1.25rem);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--cf-text);
  pointer-events: none;
}

.checkout-float-fields .form-group.field--float.focused > label {
  color: var(--cf-pink);
}

.checkout-float-fields .input-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-squircle-r, var(--checkout-radius-control));
  padding: 0 0.9rem;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.checkout-float-fields .input-wrapper.cf-squircle--control {
  border-radius: var(--cf-squircle-r, var(--checkout-radius-control));
}

.checkout-float-fields .input-wrapper input {
  flex: 1;
  min-width: 0;
  width: 100%;
  border: none;
  background: transparent;
  padding: 0.95rem 0 0.85rem;
  font-family: inherit;
  font-size: max(16px, 0.95rem);
  color: var(--cf-text);
  outline: none;
}

.checkout-float-fields .form-group.focused .input-wrapper {
  border-color: #d4a8ac;
  box-shadow: 0 0 0 3px rgba(201, 137, 142, 0.1);
}

.checkout-float-fields .input-wrapper input::placeholder {
  color: #b0b8b5;
}

.checkout-field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  width: 100%;
  min-width: 0;
}

.checkout-field-row .form-group.field--float {
  margin-top: 0.35rem;
  min-width: 0;
}

.checkout-pix .checkout-btn--secondary,
.checkout-pix .checkout-btn--ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 2.75rem;
  border: none;
  border-radius: var(--checkout-radius-control);
  padding: 0.75rem 1rem;
  font-size: 0.88rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.checkout-pix .checkout-btn--secondary {
  margin-bottom: 0.65rem;
  background: rgba(0, 0, 0, 0.05);
  color: var(--cf-text);
}

.checkout-pix .checkout-btn--ghost {
  margin-top: 0.35rem;
  background: transparent;
  color: var(--cf-green-dark, #6f7863);
}

.checkout-pix-start .patient-auth-submit {
  margin-top: 0.35rem;
}

.checkout-pix--automatic .checkout-pix-open-btn {
  width: 100%;
  margin-bottom: 0.65rem;
}

.checkout-pix-redirect {
  margin: 0 0 0.85rem;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--cf-green-dark, #6f7863);
}

.checkout-pix,
.checkout-pix-start {
  text-align: center;
}

.checkout-pix h3 {
  margin: 0 0 0.35rem;
  font-size: 1rem;
}

.checkout-pix-amount {
  margin: 0 0 1rem;
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--cf-green-dark, #6f7863);
}

.checkout-pix-qr {
  width: min(220px, 72vw);
  height: auto;
  margin: 0 auto 1rem;
  border-radius: var(--checkout-radius-inner);
  box-shadow: 0 8px 24px rgba(20, 20, 20, 0.08);
}

.checkout-pix-copy {
  width: 100%;
  margin: 0 0 0.85rem;
  text-align: left;
}

.checkout-pix-copy-label {
  display: block;
  margin: 0 0 0.4rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--cf-text-muted);
}

.checkout-pix-copy-code {
  width: 100%;
  margin: 0 0 0.65rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--cf-border);
  border-radius: var(--cf-squircle-r, var(--checkout-radius-control));
  background: rgba(0, 0, 0, 0.03);
  color: var(--cf-text);
  font-size: 0.72rem;
  line-height: 1.35;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  resize: none;
  word-break: break-all;
}

.checkout-pix-copy-btn {
  width: 100%;
}

.checkout-sandbox-note {
  margin: 0 0 0.65rem;
  padding: 0.6rem 0.7rem;
  border-radius: var(--checkout-radius-inner);
  background: rgba(193, 123, 128, 0.1);
  font-size: 0.74rem;
  line-height: 1.4;
  text-align: left;
}

.checkout-sandbox-link {
  display: block;
  margin-bottom: 0.65rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--cf-green-dark, #6f7863);
}

.checkout-pix-hint,
.checkout-pix-start-note {
  margin: 0 0 0.85rem;
  font-size: 0.76rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
}

@media (min-width: 768px) {
  .checkout-shell {
    max-width: 32rem;
    padding-bottom: 2rem;
  }

  .checkout-payment {
    padding: 1.15rem 1.2rem 1.25rem;
  }

  .checkout-hero {
    padding-bottom: 1.35rem;
  }
}

@media (max-width: 540px) {
  .checkout-field-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
}

@media (max-width: 380px) {
  .checkout-benefits {
    gap: 0.35rem;
  }

  .checkout-benefits li {
    font-size: 0.68rem;
    padding: 0.34rem 0.55rem;
  }
}
</style>
