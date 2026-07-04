<template>
  <NuxtLayout name="dashboard">
    <div class="finance-container">
      <div class="admin-shell">
        <header class="admin-shell-header">
          <div>
            <h1>Centro Financeiro</h1>
            <p>Monitore seu faturamento, membros ativos e desempenho do portal.</p>
          </div>
          <button type="button" class="admin-btn-secondary">
            <Download class="btn-icon" />
            Exportar Relatório
          </button>
        </header>

        <!-- KPIs: Métricas de Impacto -->
        <p v-if="summaryError" class="plans-error" role="alert">{{ summaryError }}</p>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon-box blue">
              <TrendingUp />
            </div>
            <div class="stat-data">
              <span class="stat-label">Faturamento Total</span>
              <h2 class="stat-value">{{ formatCurrency(summary.totalRevenue) }}</h2>
              <span class="stat-change positive">+{{ summary.growth }}% este mês</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-box green">
              <Users />
            </div>
            <div class="stat-data">
              <span class="stat-label">Membros Ativos</span>
              <h2 class="stat-value">{{ summary.activeMembers }}</h2>
              <span class="stat-change positive" v-if="summary.activeMembers > 0">{{ summary.activeMembers }} com plano pago</span>
              <span class="stat-change" v-else>Nenhum membro pago ainda</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-box purple">
              <CreditCard />
            </div>
            <div class="stat-data">
              <span class="stat-label">Ticket Médio</span>
              <h2 class="stat-value">{{ formatCurrency(summary.averageTicket) }}</h2>
              <span class="stat-change">Por transação paga</span>
            </div>
          </div>
        </div>

        <!-- Planos e valores -->
        <section class="plans-section">
          <div class="section-header">
            <div>
              <h3>Planos e valores</h3>
              <p class="plans-intro">Monte os planos que o paciente vê na assinatura — nome, valor, descrição e se renova sozinho.</p>
            </div>
            <div class="plans-header-actions">
              <button type="button" class="admin-btn-secondary" @click="addProduct">
                + Novo plano
              </button>
              <button
                type="button"
                class="admin-btn-primary"
                :disabled="productsSaving"
                @click="saveProducts"
              >
                {{ productsSaving ? 'Salvando…' : 'Salvar planos' }}
              </button>
            </div>
          </div>

          <p v-if="productsError" class="plans-error" role="alert">{{ productsError }}</p>
          <p v-if="productsSaved" class="plans-success">Planos atualizados com sucesso.</p>

          <div class="products-grid">
            <article
              v-for="(product, index) in products"
              :key="product._key"
              class="product-card"
            >
              <div class="product-card-header">
                <label class="product-active-toggle">
                  <input v-model="product.active" type="checkbox" />
                  <span>Ativo no checkout</span>
                </label>
                <button
                  type="button"
                  class="product-delete-btn"
                  :disabled="products.length <= 1"
                  @click="removeProduct(index)"
                >
                  Excluir
                </button>
              </div>

              <div class="product-fields">
                <div class="field field--float">
                  <label :for="`product-name-${product._key}`">Nome do plano</label>
                  <input
                    :id="`product-name-${product._key}`"
                    v-model="product.name"
                    type="text"
                    autocomplete="off"
                    placeholder="Ex.: Essencial"
                    @blur="syncProductId(product)"
                  />
                </div>

                <div class="field field--float">
                  <label :for="`product-price-${product._key}`">Valor</label>
                  <input
                    :id="`product-price-${product._key}`"
                    :value="product.priceDisplay"
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    placeholder="0,00"
                    @input="onProductPriceInput(product, $event)"
                  />
                </div>

                <div class="field field--float product-field-full">
                  <label :for="`product-desc-${product._key}`">Descrição para o paciente</label>
                  <textarea
                    :id="`product-desc-${product._key}`"
                    v-model="product.description"
                    rows="3"
                    placeholder="O que está incluso neste plano?"
                  />
                </div>

                <div class="field field--float product-field-select">
                  <label :id="`product-access-label-${product._key}`">Nível de acesso</label>
                  <SharedCfSelect
                    :id="`product-access-${product._key}`"
                    v-model="product.accessPlan"
                    :options="accessPlanOptions"
                    placeholder="Escolha o acesso"
                  />
                </div>

                <label class="product-subscription-toggle product-field-full">
                  <input v-model="product.isSubscription" type="checkbox" />
                  <span>Cobrança recorrente (renova automaticamente)</span>
                </label>

                <template v-if="product.isSubscription">
                  <div class="field field--float product-field-select product-field-full">
                    <label :id="`product-period-preset-label-${product._key}`">Tempo de renovação</label>
                    <SharedCfSelect
                      :id="`product-period-preset-${product._key}`"
                      :model-value="product.periodPreset"
                      :options="billingPeriodPresetOptions"
                      placeholder="Escolha o período"
                      @update:model-value="applyPeriodPreset(product, $event)"
                    />
                  </div>

                  <template v-if="product.periodPreset === 'custom'">
                    <div class="field field--float">
                      <label :for="`product-frequency-${product._key}`">Quantidade</label>
                      <input
                        :id="`product-frequency-${product._key}`"
                        v-model.number="product.frequency"
                        type="number"
                        min="1"
                        max="365"
                        placeholder="Ex.: 7"
                      />
                    </div>
                    <div class="field field--float product-field-select">
                      <label :id="`product-frequency-type-label-${product._key}`">Tipo</label>
                      <SharedCfSelect
                        :id="`product-frequency-type-${product._key}`"
                        v-model="product.frequencyType"
                        :options="customPeriodUnitOptions"
                        placeholder="Dias ou meses"
                      />
                    </div>
                  </template>

                  <p class="product-hint product-field-full">{{ formatPeriodSummary(product) }}</p>
                </template>
                <p v-else class="product-hint product-field-full">
                  Pagamento único: libera o acesso por 30 dias no app.
                </p>
              </div>
            </article>
          </div>
        </section>

        <!-- Chart & Transactions -->
        <div class="finance-content">
          <!-- Gráfico Simulado (Elite Style) -->
          <div class="chart-section">
            <div class="section-header">
              <h3>Evolução de Receita</h3>
              <div class="period-selector">
                <button class="period-btn active">7D</button>
                <button class="period-btn">30D</button>
                <button class="period-btn">12M</button>
              </div>
            </div>
            <div class="chart-container">
              <!-- Placeholder para gráfico botânico -->
              <div class="mock-chart">
                <div class="chart-line" v-for="(h, i) in [40, 65, 50, 85, 70, 95, 80]" :key="i" :style="{ height: h + '%' }">
                  <div class="chart-tooltip">R$ {{ (h * 50).toFixed(0) }}</div>
                </div>
              </div>
              <div class="chart-labels">
                <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span><span>Dom</span>
              </div>
            </div>
          </div>

          <!-- Transações Recentes -->
          <div class="transactions-section">
            <div class="section-header">
              <h3>Vendas Recentes</h3>
              <NuxtLink to="#" class="see-all">Ver tudo</NuxtLink>
            </div>
            <div class="transactions-list">
              <div v-for="tx in summary.recentTransactions" :key="tx.id" class="tx-item">
                <div class="tx-user">
                  <div class="tx-avatar">{{ tx.user?.name?.charAt(0) || 'U' }}</div>
                  <div>
                    <h5 class="tx-name">{{ tx.user?.name || 'Cliente' }}</h5>
                    <span class="tx-date">{{ formatDate(tx.createdAt) }} · {{ formatPlan(tx.plan) }} · {{ formatPaymentMethod(tx.paymentMethod) }}{{ tx.simulated ? ' · simulação' : '' }}</span>
                  </div>
                </div>
                <div class="tx-amount">
                  <span class="tx-value">{{ formatCurrency(tx.amount) }}</span>
                  <span class="tx-status" :class="txStatusClass(tx.status)">{{ formatTxStatus(tx.status) }}</span>
                </div>
              </div>
              
              <!-- Mock if empty -->
              <div v-if="!summary.recentTransactions?.length" class="empty-tx">
                <p>Nenhuma transação recente encontrada.</p>
              </div>
            </div>
          </div>
        </div>

        <section class="plans-section notification-logs-section">
          <div class="section-header">
            <div>
              <h3>Logs de mensagens automáticas</h3>
              <p class="plans-intro">Pagamento, carrinho abandonado, renovação e falhas — WhatsApp e e-mail.</p>
            </div>
          </div>
          <p v-if="notificationLogsError" class="plans-error">{{ notificationLogsError }}</p>
          <div class="notification-logs-list">
            <div v-for="log in notificationLogs" :key="log.id" class="notification-log-item">
              <div>
                <strong>{{ formatNotificationType(log.type) }}</strong>
                <span class="notification-log-meta">
                  {{ log.user?.name || 'Paciente' }} · {{ log.channel }} · {{ formatDate(log.createdAt) }}
                </span>
              </div>
              <span class="notification-log-status" :class="`notification-log-status--${log.status}`">
                {{ formatNotificationStatus(log.status) }}
              </span>
            </div>
            <p v-if="!notificationLogs.length && !notificationLogsError" class="product-hint">
              Nenhum envio registrado ainda.
            </p>
          </div>
        </section>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
const {
  fetchAdminProducts,
  updateAdminProducts,
  fetchFinancialSummary,
  fetchBillingNotificationLogs,
} = useBillingAdmin()

import { 
  TrendingUp, 
  Users, 
  CreditCard, 
  Download
} from 'lucide-vue-next'
import {
  formatBrlCurrencyInput,
  formatBrlFromNumber,
  parseBrlCurrencyInput,
} from '~/utils/brl-currency-input.js'

const summary = ref({
  totalRevenue: 0,
  activeMembers: 0,
  averageTicket: 0,
  growth: 0,
  recentTransactions: [],
})

const products = ref([])
const productsSaving = ref(false)
const productsError = ref('')
const productsSaved = ref(false)
const summaryError = ref('')
const notificationLogs = ref([])
const notificationLogsError = ref('')

const accessPlanOptions = [
  { value: 'PREMIUM', label: 'Essencial' },
  { value: 'PLATINUM', label: 'Completo' },
]

const BILLING_PERIOD_PRESETS = [
  { value: '10d', label: '10 dias', frequency: 10, frequencyType: 'days' },
  { value: '15d', label: '15 dias', frequency: 15, frequencyType: 'days' },
  { value: '30d', label: '30 dias', frequency: 30, frequencyType: 'days' },
  { value: '1m', label: '1 mês', frequency: 1, frequencyType: 'months' },
  { value: 'custom', label: 'Personalizado…' },
]

const billingPeriodPresetOptions = BILLING_PERIOD_PRESETS.map((preset) => ({
  value: preset.value,
  label: preset.label,
}))

const customPeriodUnitOptions = [
  { value: 'days', label: 'Dias' },
  { value: 'months', label: 'Meses' },
]

const LEGACY_PLAN_NAMES = {
  Premium: 'Essencial',
  Platinum: 'Completo',
  PREMIUM: 'Essencial',
  PLATINUM: 'Completo',
}

const ACCESS_PLAN_LABELS = {
  PREMIUM: 'Essencial',
  PLATINUM: 'Completo',
}

const fetchFinancial = async () => {
  summaryError.value = ''
  try {
    summary.value = await fetchFinancialSummary()
  } catch (err) {
    summaryError.value = err?.data?.message || 'Não foi possível carregar o resumo financeiro.'
    console.warn('Não foi possível carregar o resumo financeiro.', err)
  }
}

const loadNotificationLogs = async () => {
  notificationLogsError.value = ''
  try {
    const data = await fetchBillingNotificationLogs(60)
    notificationLogs.value = Array.isArray(data?.logs) ? data.logs : []
  } catch (err) {
    notificationLogsError.value = err?.data?.message || 'Não foi possível carregar os logs.'
  }
}

function formatNotificationType(type) {
  const map = {
    payment_success: 'Pagamento confirmado',
    payment_failed: 'Pagamento falhou',
    cart_abandoned_5m: 'Carrinho — 5 min',
    cart_abandoned_15m: 'Carrinho — 15 min',
    renewal_3d: 'Renovação em 3 dias',
    renewal_1d_before: 'Renovação — 1 dia antes (Pix WhatsApp)',
    renewal_1d_after: 'Renovação — 1 dia expirado (Pix WhatsApp)',
  }
  return map[type] || type
}

function formatNotificationStatus(status) {
  if (status === 'sent') return 'Enviado'
  if (status === 'failed') return 'Falhou'
  if (status === 'skipped') return 'Ignorado'
  return status
}

function resolvePeriodPreset(frequency, frequencyType) {
  const value = Number(frequency) || 1
  const type = frequencyType === 'days' ? 'days' : 'months'
  const match = BILLING_PERIOD_PRESETS.find(
    (preset) => preset.value !== 'custom'
      && preset.frequency === value
      && preset.frequencyType === type,
  )
  return match?.value || 'custom'
}

function applyPeriodPreset(product, presetValue) {
  product.periodPreset = presetValue
  const preset = BILLING_PERIOD_PRESETS.find((item) => item.value === presetValue)
  if (preset && preset.value !== 'custom') {
    product.frequency = preset.frequency
    product.frequencyType = preset.frequencyType
  }
}

function formatPeriodSummary(product) {
  if (!product?.isSubscription) return ''
  const amount = Math.max(1, Number(product.frequency) || 1)
  if (product.frequencyType === 'days') {
    return `O paciente renova a cada ${amount} dia${amount === 1 ? '' : 's'}.`
  }
  return `O paciente renova a cada ${amount} mês${amount === 1 ? '' : 'es'}.`
}

function mapProductFromApi(product, index = 0) {
  const rawName = String(product.name || '').trim()
  const friendlyName = LEGACY_PLAN_NAMES[rawName] || rawName
  const frequency = Number(product.frequency) || 1
  const frequencyType = product.frequencyType === 'days' ? 'days' : 'months'
  return {
    _key: product.id || `product-${index}`,
    id: product.id || `product-${index}`,
    name: friendlyName,
    description: product.description || '',
    amount: Number(product.amount) || 0,
    priceDisplay: formatBrlFromNumber(product.amount ?? 0),
    currency: 'BRL',
    isSubscription: product.isSubscription !== false,
    frequency,
    frequencyType,
    periodPreset: resolvePeriodPreset(frequency, frequencyType),
    accessPlan: product.accessPlan === 'PLATINUM' ? 'PLATINUM' : 'PREMIUM',
    active: product.active !== false,
  }
}

function slugifyProductId(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function syncProductId(product) {
  if (!product?.id || product.id.startsWith('prod-') || product.id.startsWith('product-')) {
    const slug = slugifyProductId(product.name)
    if (slug) product.id = slug
  }
}

function createEmptyProduct() {
  const key = `prod-${Date.now()}`
  return {
    _key: key,
    id: key,
    name: 'Essencial',
    description: 'Descreva o que o paciente recebe com este plano.',
    amount: 19.9,
    priceDisplay: '19,90',
    currency: 'BRL',
    isSubscription: true,
    frequency: 30,
    frequencyType: 'days',
    periodPreset: '30d',
    accessPlan: 'PREMIUM',
    active: true,
  }
}

const loadProducts = async () => {
  productsError.value = ''
  try {
    const data = await fetchAdminProducts()
    const list = Array.isArray(data?.products) ? data.products : []
    products.value = list.length
      ? list.map((item, index) => mapProductFromApi(item, index))
      : [createEmptyProduct()]
  } catch (err) {
    productsError.value = err?.data?.message || 'Não foi possível carregar os produtos.'
    if (!products.value.length) products.value = [createEmptyProduct()]
  }
}

const saveProducts = async () => {
  productsSaving.value = true
  productsError.value = ''
  productsSaved.value = false
  try {
    const payload = products.value.map((product) => {
      syncProductId(product)
      const amount = parseBrlCurrencyInput(product.priceDisplay)
      if (!String(product.name || '').trim()) {
        throw new Error('Informe o nome de todos os produtos.')
      }
      if (amount <= 0) {
        throw new Error(`Preço inválido em "${product.name}".`)
      }
      if (product.isSubscription) {
        const frequency = Math.max(1, Number(product.frequency) || 1)
        if (frequency > 365) {
          throw new Error(`Período inválido em "${product.name}". Use no máximo 365.`)
        }
      }
      return {
        id: product.id,
        name: String(product.name).trim(),
        description: String(product.description || '').trim(),
        amount,
        currency: 'BRL',
        isSubscription: Boolean(product.isSubscription),
        frequency: Math.max(1, Number(product.frequency) || 1),
        frequencyType: product.frequencyType === 'days' ? 'days' : 'months',
        accessPlan: product.accessPlan === 'PLATINUM' ? 'PLATINUM' : 'PREMIUM',
        active: Boolean(product.active),
      }
    })

    const data = await updateAdminProducts(payload)
    products.value = (data?.products || payload).map((item, index) => mapProductFromApi(item, index))
    productsSaved.value = true
    setTimeout(() => { productsSaved.value = false }, 3000)
  } catch (err) {
    productsError.value = err?.message || err?.data?.message || 'Não foi possível salvar os produtos.'
  } finally {
    productsSaving.value = false
  }
}

function addProduct() {
  products.value.push(createEmptyProduct())
}

function removeProduct(index) {
  if (products.value.length <= 1) return
  products.value.splice(index, 1)
}

function onProductPriceInput(product, event) {
  const formatted = formatBrlCurrencyInput(event.target.value)
  product.priceDisplay = formatted
  product.amount = parseBrlCurrencyInput(formatted)
  event.target.value = formatted
}

const formatCurrency = (val) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('pt-BR')
}

const formatPlan = (plan) => ACCESS_PLAN_LABELS[plan] || plan || '—'

const formatPaymentMethod = (method) => {
  if (method === 'pix') return 'Pix'
  if (method === 'card') return 'Cartão'
  return method || '—'
}

const formatTxStatus = (status) => {
  if (status === 'PAID') return 'Pago'
  if (status === 'PENDING') return 'Pendente'
  if (status === 'CANCELLED') return 'Cancelado'
  return status
}

const txStatusClass = (status) => {
  if (status === 'PAID') return 'paid'
  if (status === 'PENDING') return 'pending'
  return 'cancelled'
}

onMounted(async () => {
  await Promise.all([fetchFinancial(), loadProducts(), loadNotificationLogs()])
})
</script>

<style scoped>
.finance-container {
  min-height: 100%;
  background-color: #fcfcfc;
}

.finance-page {
  padding: 3rem;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 3.5rem;
}

.page-header h1 {
  font-size: 2.2rem;
  font-weight: 800;
  color: #111;
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
}

.page-header p {
  font-size: 1rem;
  color: #666;
}

.btn-export {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #eee;
  padding: 0.7rem 1.4rem;
  border-radius: 12px;
  font-weight: 700;
  color: #444;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export:hover {
  background: #f8fbf8;
  border-color: var(--primary-light);
  color: var(--primary);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-bottom: 3rem;
}

.stat-card {
  background: white;
  padding: 2rem;
  border-radius: 24px;
  border: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  transition: transform 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 30px rgba(0,0,0,0.03);
}

.stat-icon-box {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-box svg { width: 28px; height: 28px; }

.stat-icon-box.green { background: #f0fdf4; color: #16a34a; }
.stat-icon-box.blue { background: #eff6ff; color: #2563eb; }
.stat-icon-box.purple { background: #faf5ff; color: #9333ea; }

.stat-label { font-size: 0.85rem; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
.stat-value { font-size: 1.8rem; font-weight: 800; color: #111; margin: 4px 0; }
.stat-change { font-size: 0.85rem; font-weight: 700; color: #aaa; }
.stat-change.positive { color: #16a34a; }

/* Content Area */
.finance-content {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 2.5rem;
}

.chart-section, .transactions-section {
  background: white;
  border-radius: 24px;
  padding: 2.2rem;
  border: 1px solid #f0f0f0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.section-header h3 { font-size: 1.25rem; font-weight: 800; color: #111; }

.period-selector {
  background: #f8f8f8;
  padding: 4px;
  border-radius: 10px;
  display: flex;
  gap: 4px;
}

.period-btn {
  border: none;
  background: transparent;
  padding: 0.4rem 0.8rem;
  border-radius: 7px;
  font-size: 0.75rem;
  font-weight: 800;
  color: #777;
  cursor: pointer;
  transition: 0.2s;
}

.period-btn.active { background: white; color: var(--primary); box-shadow: 0 2px 6px rgba(0,0,0,0.05); }

/* Mock Chart */
.chart-container {
  height: 250px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.mock-chart {
  display: flex;
  align-items: flex-end;
  gap: 1.5rem;
  height: 200px;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f8f8f8;
}

.chart-line {
  flex: 1;
  background: linear-gradient(to top, var(--primary), var(--primary-light));
  border-radius: 8px 8px 4px 4px;
  position: relative;
  transition: all 0.3s;
  opacity: 0.8;
}

.chart-line:hover { opacity: 1; transform: scaleY(1.05); }

.chart-tooltip {
  position: absolute;
  top: -35px;
  left: 50%;
  transform: translateX(-50%);
  background: #111;
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  opacity: 0;
  pointer-events: none;
  transition: 0.2s;
}

.chart-line:hover .chart-tooltip { opacity: 1; top: -45px; }

.chart-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #bbb;
  padding: 0 0.5rem;
}

/* Transactions */
.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.tx-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 0;
}

.tx-user { display: flex; align-items: center; gap: 1rem; }

.tx-avatar {
  width: 40px;
  height: 40px;
  background: #f8fbf8;
  color: var(--primary);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  border: 1px solid #eff6ef;
}

.tx-name { font-size: 0.95rem; font-weight: 700; color: #111; margin-bottom: 2px; }
.tx-date { font-size: 0.8rem; color: #bbb; font-weight: 600; }

.tx-amount { text-align: right; }
.tx-value { display: block; font-size: 1rem; font-weight: 800; color: #111; margin-bottom: 4px; }
.tx-status {
  font-size: 0.7rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 5px;
}

.tx-status.paid { background: #f0fdf4; color: #16a34a; }
.tx-status.pending { background: #fffbeb; color: #d97706; }
.tx-status.cancelled { background: #fef2f2; color: #dc2626; }

.plans-section {
  background: white;
  border-radius: 24px;
  padding: 2rem;
  border: 1px solid #f0f0f0;
  margin-bottom: 2.5rem;
}

.plans-intro {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  color: #888;
}

.plans-header-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
}

.product-card {
  border: 1px solid #ececec;
  border-radius: 18px;
  padding: 1.1rem;
  background: #fcfcfc;
}

.product-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.product-active-toggle,
.product-subscription-toggle {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: #444;
}

.product-delete-btn {
  border: none;
  background: transparent;
  color: #dc2626;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.product-delete-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.product-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.product-field-full {
  grid-column: 1 / -1;
}

.product-hint {
  margin: 0;
  font-size: 0.78rem;
  color: #888;
  line-height: 1.4;
}

.plans-section .field--float {
  position: relative;
  margin-top: 0.35rem;
}

.plans-section .field--float label {
  position: absolute;
  top: -0.58rem;
  left: 0.78rem;
  margin: 0;
  padding: 0 0.4rem;
  background: #fcfcfc;
  z-index: 2;
  font-size: 0.76rem;
  font-weight: 600;
  color: #444;
  line-height: 1;
}

.plans-section .field--float input,
.plans-section .field--float textarea,
.plans-section .field--float select {
  width: 100%;
  padding: 0.85rem 0.9rem;
  border: 1.5px solid #e8ece9;
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.9rem;
  box-sizing: border-box;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.plans-section .field--float input,
.plans-section .field--float textarea,
.plans-section .field--float select {
  padding-top: 0.95rem;
}

.product-field-select :deep(.cf-select) {
  width: 100%;
}

.product-field-select :deep(.cf-select-trigger) {
  width: 100%;
  min-height: 48px;
  padding: 0.95rem 0.9rem 0.75rem;
  border: 1.5px solid #e8ece9;
  border-radius: 12px;
  background: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  color: #222;
  box-shadow: none;
}

.product-field-select :deep(.cf-select-trigger:hover:not(:disabled)) {
  border-color: #cfe0cb;
}

.product-field-select :deep(.cf-select--open .cf-select-trigger) {
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.08);
}

.product-field-select :deep(.cf-select-chevron) {
  width: 1rem;
  height: 1rem;
  color: #6b7280;
}

.product-field-select :deep(.cf-select-value) {
  text-align: left;
  font-weight: 600;
  color: #1a2e24;
}

.plans-section .field input:focus,
.plans-section .field textarea:focus,
.plans-section .field select:focus {
  outline: none;
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.08);
}

.plans-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
  margin-bottom: 0.75rem;
}

.plan-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #555;
}

.plan-field input {
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 0.75rem 0.9rem;
  font-size: 1rem;
  font-weight: 600;
}

.plans-hint {
  margin: 0;
  font-size: 0.82rem;
  color: #888;
}

.plans-error {
  color: #dc2626;
  font-size: 0.85rem;
  margin: 0 0 0.75rem;
}

.plans-success {
  color: #16a34a;
  font-size: 0.85rem;
  margin: 0 0 0.75rem;
}

.notification-logs-section {
  margin-top: 0;
}

.notification-logs-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.notification-log-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid #ececec;
  border-radius: 12px;
  background: #fcfcfc;
}

.notification-log-meta {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.76rem;
  color: #888;
  font-weight: 500;
}

.notification-log-status {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  white-space: nowrap;
}

.notification-log-status--sent {
  background: #f0fdf4;
  color: #16a34a;
}

.notification-log-status--failed {
  background: #fef2f2;
  color: #dc2626;
}

.notification-log-status--skipped {
  background: #f4f4f5;
  color: #71717a;
}

.see-all { font-size: 0.85rem; font-weight: 700; color: var(--primary); text-decoration: none; }
.empty-tx { text-align: center; color: #ccc; padding: 2rem 0; font-size: 0.9rem; }
</style>

