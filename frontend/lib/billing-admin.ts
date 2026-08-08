import { apiFetch } from '@/lib/api'

export type BillingProduct = {
  id: string
  name: string
  description?: string
  amount: number
  currency?: string
  isSubscription?: boolean
  frequency?: number
  frequencyType?: 'days' | 'months'
  accessPlan?: 'PREMIUM' | 'PLATINUM'
  active?: boolean
}

export type FinancialTransaction = {
  id: string
  amount: number
  status: 'PAID' | 'PENDING' | 'CANCELLED' | string
  plan?: string
  paymentMethod?: string
  simulated?: boolean
  createdAt: string
  user?: { name?: string }
}

export type FinancialSummary = {
  totalRevenue: number
  activeMembers: number
  averageTicket: number
  growth: number
  recentTransactions: FinancialTransaction[]
}

export type BillingNotificationLog = {
  id: string
  type: string
  channel: string
  status: 'sent' | 'failed' | 'skipped' | string
  createdAt: string
  user?: { name?: string }
}

function billingAdminError(err: unknown, fallback: string): string {
  const e = err as { statusCode?: number; status?: number; response?: { status?: number }; data?: { message?: string } } | null
  const status = e?.statusCode ?? e?.status ?? e?.response?.status
  if (status === 404) {
    return 'Rotas de billing não encontradas no servidor. Faça redeploy do backend (apiclube) com a versão mais recente.'
  }
  return e?.data?.message || fallback
}

export async function fetchAdminProducts(): Promise<{ products?: BillingProduct[] }> {
  try {
    return await apiFetch<{ products?: BillingProduct[] }>('/billing/admin/products')
  } catch (err) {
    const message = billingAdminError(err, 'Não foi possível carregar os produtos.')
    throw Object.assign(new Error(message), { data: { message } })
  }
}

export async function updateAdminProducts(
  products: BillingProduct[],
): Promise<{ products?: BillingProduct[] }> {
  try {
    return await apiFetch<{ products?: BillingProduct[] }>('/billing/admin/products', {
      method: 'PUT',
      body: JSON.stringify({ products }),
    })
  } catch (err) {
    const message = billingAdminError(err, 'Não foi possível salvar os produtos.')
    throw Object.assign(new Error(message), { data: { message } })
  }
}

export async function fetchFinancialSummary(): Promise<FinancialSummary> {
  try {
    return await apiFetch<FinancialSummary>('/billing/admin/summary')
  } catch (err) {
    const message = billingAdminError(err, 'Não foi possível carregar o resumo financeiro.')
    throw Object.assign(new Error(message), { data: { message } })
  }
}

export async function fetchBillingNotificationLogs(
  limit = 80,
): Promise<{ logs?: BillingNotificationLog[] }> {
  try {
    return await apiFetch<{ logs?: BillingNotificationLog[] }>(
      `/billing/admin/notification-logs?limit=${limit}`,
    )
  } catch (err) {
    const message = billingAdminError(err, 'Não foi possível carregar os logs.')
    throw Object.assign(new Error(message), { data: { message } })
  }
}
