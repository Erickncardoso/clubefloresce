'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { CreditCard, Download, TrendingUp, Users } from 'lucide-react'
import {
  fetchAdminProducts,
  fetchBillingNotificationLogs,
  fetchFinancialSummary,
  updateAdminProducts,
} from '@/lib/billing-admin'
import type {
  BillingNotificationLog,
  BillingProduct,
  FinancialSummary,
} from '@/lib/billing-admin'
import {
  formatBrlCurrencyInput,
  formatBrlFromNumber,
  parseBrlCurrencyInput,
} from '@/lib/brl-currency'
import styles from './financeiro.module.scss'

// ─── local product shape (includes UI-only fields) ────────────────────────────

type FrequencyType = 'days' | 'months'
type PeriodPreset = '10d' | '15d' | '30d' | '1m' | 'custom'

type ProductRow = {
  _key: string
  id: string
  name: string
  description: string
  amount: number
  priceDisplay: string
  currency: string
  isSubscription: boolean
  frequency: number
  frequencyType: FrequencyType
  periodPreset: PeriodPreset
  accessPlan: 'PREMIUM' | 'PLATINUM'
  active: boolean
}

// ─── constants ────────────────────────────────────────────────────────────────

const ACCESS_PLAN_OPTIONS = [
  { value: 'PREMIUM', label: 'Essencial' },
  { value: 'PLATINUM', label: 'Completo' },
]

const BILLING_PERIOD_PRESETS: {
  value: PeriodPreset
  label: string
  frequency?: number
  frequencyType?: FrequencyType
}[] = [
  { value: '10d', label: '10 dias', frequency: 10, frequencyType: 'days' },
  { value: '15d', label: '15 dias', frequency: 15, frequencyType: 'days' },
  { value: '30d', label: '30 dias', frequency: 30, frequencyType: 'days' },
  { value: '1m', label: '1 mês', frequency: 1, frequencyType: 'months' },
  { value: 'custom', label: 'Personalizado…' },
]

const CUSTOM_PERIOD_UNIT_OPTIONS = [
  { value: 'days', label: 'Dias' },
  { value: 'months', label: 'Meses' },
]

const LEGACY_PLAN_NAMES: Record<string, string> = {
  Premium: 'Essencial',
  Platinum: 'Completo',
  PREMIUM: 'Essencial',
  PLATINUM: 'Completo',
}

const ACCESS_PLAN_LABELS: Record<string, string> = {
  PREMIUM: 'Essencial',
  PLATINUM: 'Completo',
}

const CHART_BARS = [40, 65, 50, 85, 70, 95, 80]
const CHART_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']

const EMPTY_SUMMARY: FinancialSummary = {
  totalRevenue: 0,
  activeMembers: 0,
  averageTicket: 0,
  growth: 0,
  recentTransactions: [],
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function resolvePeriodPreset(frequency: number, frequencyType: FrequencyType): PeriodPreset {
  const value = Number(frequency) || 1
  const type: FrequencyType = frequencyType === 'days' ? 'days' : 'months'
  const match = BILLING_PERIOD_PRESETS.find(
    (p) => p.value !== 'custom' && p.frequency === value && p.frequencyType === type,
  )
  return (match?.value ?? 'custom') as PeriodPreset
}

function mapProductFromApi(product: BillingProduct, index = 0): ProductRow {
  const rawName = String(product.name || '').trim()
  const friendlyName = LEGACY_PLAN_NAMES[rawName] ?? rawName
  const frequency = Number(product.frequency) || 1
  const frequencyType: FrequencyType = product.frequencyType === 'days' ? 'days' : 'months'
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

function slugifyProductId(name: string): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function syncProductId(product: ProductRow): void {
  if (!product.id || product.id.startsWith('prod-') || product.id.startsWith('product-')) {
    const slug = slugifyProductId(product.name)
    if (slug) product.id = slug
  }
}

function createEmptyProduct(): ProductRow {
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

function formatPeriodSummary(product: ProductRow): string {
  if (!product.isSubscription) return ''
  const amount = Math.max(1, Number(product.frequency) || 1)
  if (product.frequencyType === 'days') {
    return `O paciente renova a cada ${amount} dia${amount === 1 ? '' : 's'}.`
  }
  return `O paciente renova a cada ${amount} mês${amount === 1 ? '' : 'es'}.`
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
}

function formatDateBr(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR')
}

function formatPlan(plan?: string): string {
  return ACCESS_PLAN_LABELS[plan ?? ''] ?? plan ?? '—'
}

function formatPaymentMethod(method?: string): string {
  if (method === 'pix') return 'Pix'
  if (method === 'card') return 'Cartão'
  return method || '—'
}

function formatTxStatus(status?: string): string {
  if (status === 'PAID') return 'Pago'
  if (status === 'PENDING') return 'Pendente'
  if (status === 'CANCELLED') return 'Cancelado'
  return status || '—'
}

function txStatusClass(status?: string): string {
  if (status === 'PAID') return styles.txStatusPaid
  if (status === 'PENDING') return styles.txStatusPending
  return styles.txStatusCancelled
}

function formatNotificationType(type: string): string {
  const map: Record<string, string> = {
    payment_success: 'Pagamento confirmado',
    payment_failed: 'Pagamento falhou',
    cart_abandoned_5m: 'Carrinho — 5 min',
    cart_abandoned_15m: 'Carrinho — 15 min',
    renewal_3d: 'Renovação em 3 dias',
    renewal_1d_before: 'Renovação — 1 dia antes (WhatsApp)',
    renewal_1d_after: 'Renovação — 1 dia expirado (e-mail)',
  }
  return map[type] ?? type
}

function formatNotificationStatus(status: string): string {
  if (status === 'sent') return 'Enviado'
  if (status === 'failed') return 'Falhou'
  if (status === 'skipped') return 'Ignorado'
  return status
}

// ─── sub-components ───────────────────────────────────────────────────────────

function ProductCard({
  product,
  index,
  totalCount,
  onChange,
  onRemove,
}: {
  product: ProductRow
  index: number
  totalCount: number
  onChange: (updated: ProductRow) => void
  onRemove: () => void
}) {
  const nameId = useId()
  const priceId = useId()
  const descId = useId()
  const accessId = useId()
  const periodPresetId = useId()
  const frequencyId = useId()
  const frequencyTypeId = useId()

  function set<K extends keyof ProductRow>(key: K, value: ProductRow[K]) {
    onChange({ ...product, [key]: value })
  }

  function handlePriceInput(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatBrlCurrencyInput(e.target.value)
    e.target.value = formatted
    onChange({ ...product, priceDisplay: formatted, amount: parseBrlCurrencyInput(formatted) })
  }

  function handleNameBlur() {
    const updated = { ...product }
    syncProductId(updated)
    onChange(updated)
  }

  function applyPeriodPreset(presetValue: PeriodPreset) {
    const preset = BILLING_PERIOD_PRESETS.find((p) => p.value === presetValue)
    const updated: ProductRow = { ...product, periodPreset: presetValue }
    if (preset && preset.value !== 'custom' && preset.frequency && preset.frequencyType) {
      updated.frequency = preset.frequency
      updated.frequencyType = preset.frequencyType
    }
    onChange(updated)
  }

  return (
    <article className={styles.productCard}>
      <div className={styles.productCardHeader}>
        <label className={styles.productActiveToggle}>
          <input
            type="checkbox"
            checked={product.active}
            onChange={(e) => set('active', e.target.checked)}
          />
          <span>Ativo no checkout</span>
        </label>
        <button
          type="button"
          className={styles.productDeleteBtn}
          disabled={totalCount <= 1}
          onClick={onRemove}
        >
          Excluir
        </button>
      </div>

      <div className={styles.productFields}>
        {/* Nome */}
        <div className="field field--float">
          <label htmlFor={nameId}>Nome do plano</label>
          <input
            id={nameId}
            type="text"
            autoComplete="off"
            placeholder="Ex.: Essencial"
            value={product.name}
            onChange={(e) => set('name', e.target.value)}
            onBlur={handleNameBlur}
          />
        </div>

        {/* Valor */}
        <div className="field field--float">
          <label htmlFor={priceId}>Valor</label>
          <input
            id={priceId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            defaultValue={product.priceDisplay}
            key={`price-${product._key}`}
            onInput={handlePriceInput as unknown as React.FormEventHandler<HTMLInputElement>}
          />
        </div>

        {/* Descrição */}
        <div className={`field field--float ${styles.productFieldFull}`}>
          <label htmlFor={descId}>Descrição para o paciente</label>
          <textarea
            id={descId}
            rows={3}
            placeholder="O que está incluso neste plano?"
            value={product.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        {/* Nível de acesso */}
        <div className={`field field--float ${styles.productFieldFull}`}>
          <label htmlFor={accessId}>Nível de acesso</label>
          <select
            id={accessId}
            value={product.accessPlan}
            onChange={(e) => set('accessPlan', e.target.value as 'PREMIUM' | 'PLATINUM')}
          >
            {ACCESS_PLAN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Cobrança recorrente */}
        <label className={`${styles.productSubscriptionToggle} ${styles.productFieldFull}`}>
          <input
            type="checkbox"
            checked={product.isSubscription}
            onChange={(e) => set('isSubscription', e.target.checked)}
          />
          <span>Cobrança recorrente (renova automaticamente)</span>
        </label>

        {product.isSubscription ? (
          <>
            {/* Período preset */}
            <div className={`field field--float ${styles.productFieldFull}`}>
              <label htmlFor={periodPresetId}>Tempo de renovação</label>
              <select
                id={periodPresetId}
                value={product.periodPreset}
                onChange={(e) => applyPeriodPreset(e.target.value as PeriodPreset)}
              >
                <option value="" disabled>
                  Escolha o período
                </option>
                {BILLING_PERIOD_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {product.periodPreset === 'custom' && (
              <>
                <div className="field field--float">
                  <label htmlFor={frequencyId}>Quantidade</label>
                  <input
                    id={frequencyId}
                    type="number"
                    min={1}
                    max={365}
                    placeholder="Ex.: 7"
                    value={product.frequency}
                    onChange={(e) => set('frequency', Number(e.target.value))}
                  />
                </div>
                <div className="field field--float">
                  <label htmlFor={frequencyTypeId}>Tipo</label>
                  <select
                    id={frequencyTypeId}
                    value={product.frequencyType}
                    onChange={(e) => set('frequencyType', e.target.value as FrequencyType)}
                  >
                    {CUSTOM_PERIOD_UNIT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <p className={`${styles.productHint} ${styles.productFieldFull}`}>
              {formatPeriodSummary(product)}
            </p>
          </>
        ) : (
          <p className={`${styles.productHint} ${styles.productFieldFull}`}>
            Pagamento único: libera o acesso por 30 dias no app.
          </p>
        )}
      </div>
    </article>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const [summary, setSummary] = useState<FinancialSummary>(EMPTY_SUMMARY)
  const [summaryError, setSummaryError] = useState('')

  const [products, setProducts] = useState<ProductRow[]>([])
  const [productsSaving, setProductsSaving] = useState(false)
  const [productsError, setProductsError] = useState('')
  const [productsSaved, setProductsSaved] = useState(false)

  const [notificationLogs, setNotificationLogs] = useState<BillingNotificationLog[]>([])
  const [notificationLogsError, setNotificationLogsError] = useState('')

  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── loaders ───────────────────────────────────────────────────────────────

  const loadSummary = useCallback(async () => {
    setSummaryError('')
    try {
      const data = await fetchFinancialSummary()
      setSummary(data)
    } catch (err) {
      const e = err as { data?: { message?: string } } | null
      setSummaryError(e?.data?.message || 'Não foi possível carregar o resumo financeiro.')
    }
  }, [])

  const loadProducts = useCallback(async () => {
    setProductsError('')
    try {
      const data = await fetchAdminProducts()
      const list = Array.isArray(data?.products) ? data.products : []
      setProducts(
        list.length
          ? list.map((item, idx) => mapProductFromApi(item, idx))
          : [createEmptyProduct()],
      )
    } catch (err) {
      const e = err as { data?: { message?: string } } | null
      setProductsError(e?.data?.message || 'Não foi possível carregar os produtos.')
      setProducts((prev) => (prev.length ? prev : [createEmptyProduct()]))
    }
  }, [])

  const loadNotificationLogs = useCallback(async () => {
    setNotificationLogsError('')
    try {
      const data = await fetchBillingNotificationLogs(60)
      setNotificationLogs(Array.isArray(data?.logs) ? data.logs : [])
    } catch (err) {
      const e = err as { data?: { message?: string } } | null
      setNotificationLogsError(e?.data?.message || 'Não foi possível carregar os logs.')
    }
  }, [])

  useEffect(() => {
    void Promise.all([loadSummary(), loadProducts(), loadNotificationLogs()])
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [loadSummary, loadProducts, loadNotificationLogs])

  // ── product actions ───────────────────────────────────────────────────────

  function updateProduct(index: number, updated: ProductRow) {
    setProducts((prev) => prev.map((p, i) => (i === index ? updated : p)))
  }

  function addProduct() {
    setProducts((prev) => [...prev, createEmptyProduct()])
  }

  function removeProduct(index: number) {
    setProducts((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  async function saveProducts() {
    setProductsSaving(true)
    setProductsError('')
    setProductsSaved(false)

    try {
      const payload = products.map((product) => {
        const p = { ...product }
        syncProductId(p)
        const amount = parseBrlCurrencyInput(p.priceDisplay)
        if (!String(p.name || '').trim()) {
          throw new Error('Informe o nome de todos os produtos.')
        }
        if (amount <= 0) {
          throw new Error(`Preço inválido em "${p.name}".`)
        }
        if (p.isSubscription) {
          const frequency = Math.max(1, Number(p.frequency) || 1)
          if (frequency > 365) {
            throw new Error(`Período inválido em "${p.name}". Use no máximo 365.`)
          }
        }
        return {
          id: p.id,
          name: String(p.name).trim(),
          description: String(p.description || '').trim(),
          amount,
          currency: 'BRL' as const,
          isSubscription: Boolean(p.isSubscription),
          frequency: Math.max(1, Number(p.frequency) || 1),
          frequencyType: (p.frequencyType === 'days' ? 'days' : 'months') as FrequencyType,
          accessPlan: (p.accessPlan === 'PLATINUM' ? 'PLATINUM' : 'PREMIUM') as
            | 'PLATINUM'
            | 'PREMIUM',
          active: Boolean(p.active),
        }
      })

      const data = await updateAdminProducts(payload)
      const saved = (data?.products ?? payload).map((item, idx) =>
        mapProductFromApi(item as BillingProduct, idx),
      )
      setProducts(saved)
      setProductsSaved(true)
      savedTimerRef.current = setTimeout(() => setProductsSaved(false), 3000)
    } catch (err) {
      const e = err as { message?: string; data?: { message?: string } } | null
      setProductsError(e?.message || e?.data?.message || 'Não foi possível salvar os produtos.')
    } finally {
      setProductsSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.financeContainer}>
      <div className="admin-shell">
        <header className="admin-shell-header">
          <div>
            <h1>Centro Financeiro</h1>
            <p>Monitore seu faturamento, membros ativos e desempenho do portal.</p>
          </div>
          <button type="button" className="admin-btn-secondary">
            <Download size={16} aria-hidden className="btn-icon" />
            Exportar Relatório
          </button>
        </header>

        {/* KPIs */}
        {summaryError && (
          <p className={styles.plansError} role="alert">
            {summaryError}
          </p>
        )}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statIconBox} ${styles.statIconBlue}`}>
              <TrendingUp size={28} aria-hidden />
            </div>
            <div className={styles.statData}>
              <span className={styles.statLabel}>Faturamento Total</span>
              <h2 className={styles.statValue}>{formatCurrency(summary.totalRevenue)}</h2>
              <span className={`${styles.statChange} ${styles.statChangePositive}`}>
                +{summary.growth}% este mês
              </span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIconBox} ${styles.statIconGreen}`}>
              <Users size={28} aria-hidden />
            </div>
            <div className={styles.statData}>
              <span className={styles.statLabel}>Membros Ativos</span>
              <h2 className={styles.statValue}>{summary.activeMembers}</h2>
              {summary.activeMembers > 0 ? (
                <span className={`${styles.statChange} ${styles.statChangePositive}`}>
                  {summary.activeMembers} com plano pago
                </span>
              ) : (
                <span className={styles.statChange}>Nenhum membro pago ainda</span>
              )}
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIconBox} ${styles.statIconPurple}`}>
              <CreditCard size={28} aria-hidden />
            </div>
            <div className={styles.statData}>
              <span className={styles.statLabel}>Ticket Médio</span>
              <h2 className={styles.statValue}>{formatCurrency(summary.averageTicket)}</h2>
              <span className={styles.statChange}>Por transação paga</span>
            </div>
          </div>
        </div>

        {/* Planos e valores */}
        <section className={styles.plansSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>Planos e valores</h3>
              <p className={styles.plansIntro}>
                Monte os planos que o paciente vê na assinatura — nome, valor, descrição e se renova
                sozinho.
              </p>
            </div>
            <div className={styles.plansHeaderActions}>
              <button type="button" className="admin-btn-secondary" onClick={addProduct}>
                + Novo plano
              </button>
              <button
                type="button"
                className="admin-btn-primary"
                disabled={productsSaving}
                onClick={saveProducts}
              >
                {productsSaving ? 'Salvando…' : 'Salvar planos'}
              </button>
            </div>
          </div>

          {productsError && (
            <p className={styles.plansError} role="alert">
              {productsError}
            </p>
          )}
          {productsSaved && <p className={styles.plansSuccess}>Planos atualizados com sucesso.</p>}

          <div className={styles.productsGrid}>
            {products.map((product, index) => (
              <ProductCard
                key={product._key}
                product={product}
                index={index}
                totalCount={products.length}
                onChange={(updated) => updateProduct(index, updated)}
                onRemove={() => removeProduct(index)}
              />
            ))}
          </div>
        </section>

        {/* Chart & Transações */}
        <div className={styles.financeContent}>
          {/* Gráfico mock */}
          <div className={styles.chartSection}>
            <div className={styles.sectionHeader}>
              <h3>Evolução de Receita</h3>
              <div className={styles.periodSelector}>
                <button type="button" className={`${styles.periodBtn} ${styles.periodBtnActive}`}>
                  7D
                </button>
                <button type="button" className={styles.periodBtn}>
                  30D
                </button>
                <button type="button" className={styles.periodBtn}>
                  12M
                </button>
              </div>
            </div>
            <div className={styles.chartContainer}>
              <div className={styles.mockChart}>
                {CHART_BARS.map((h, i) => (
                  <div key={i} className={styles.chartLine} style={{ height: `${h}%` }}>
                    <div className={styles.chartTooltip}>R$ {(h * 50).toFixed(0)}</div>
                  </div>
                ))}
              </div>
              <div className={styles.chartLabels}>
                {CHART_LABELS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Transações recentes */}
          <div className={styles.transactionsSection}>
            <div className={styles.sectionHeader}>
              <h3>Vendas Recentes</h3>
              <a href="#" className={styles.seeAll}>
                Ver tudo
              </a>
            </div>
            <div className={styles.transactionsList}>
              {summary.recentTransactions?.map((tx) => (
                <div key={tx.id} className={styles.txItem}>
                  <div className={styles.txUser}>
                    <div className={styles.txAvatar}>
                      {tx.user?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h5 className={styles.txName}>{tx.user?.name || 'Cliente'}</h5>
                      <span className={styles.txDate}>
                        {formatDateBr(tx.createdAt)} · {formatPlan(tx.plan)} ·{' '}
                        {formatPaymentMethod(tx.paymentMethod)}
                        {tx.simulated ? ' · simulação' : ''}
                      </span>
                    </div>
                  </div>
                  <div className={styles.txAmount}>
                    <span className={styles.txValue}>{formatCurrency(tx.amount)}</span>
                    <span className={`${styles.txStatus} ${txStatusClass(tx.status)}`}>
                      {formatTxStatus(tx.status)}
                    </span>
                  </div>
                </div>
              ))}

              {!summary.recentTransactions?.length && (
                <div className={styles.emptyTx}>
                  <p>Nenhuma transação recente encontrada.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Logs de mensagens automáticas */}
        <section className={`${styles.plansSection} ${styles.notificationLogsSection}`}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>Logs de mensagens automáticas</h3>
              <p className={styles.plansIntro}>
                Pagamento, carrinho abandonado, renovação e falhas — WhatsApp e e-mail.
              </p>
            </div>
          </div>

          {notificationLogsError && (
            <p className={styles.plansError}>{notificationLogsError}</p>
          )}

          <div className={styles.notificationLogsList}>
            {notificationLogs.map((log) => (
              <div key={log.id} className={styles.notificationLogItem}>
                <div>
                  <strong>{formatNotificationType(log.type)}</strong>
                  <span className={styles.notificationLogMeta}>
                    {log.user?.name || 'Paciente'} · {log.channel} · {formatDateBr(log.createdAt)}
                  </span>
                </div>
                <span
                  className={`${styles.notificationLogStatus} ${
                    log.status === 'sent'
                      ? styles.notificationLogStatusSent
                      : log.status === 'failed'
                        ? styles.notificationLogStatusFailed
                        : styles.notificationLogStatusSkipped
                  }`}
                >
                  {formatNotificationStatus(log.status)}
                </span>
              </div>
            ))}
            {!notificationLogs.length && !notificationLogsError && (
              <p className={styles.productHint}>Nenhum envio registrado ainda.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
