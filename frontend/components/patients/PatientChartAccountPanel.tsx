'use client'

import { useMemo, useState } from 'react'
import { Mail, MessageCircle, Pencil, RefreshCw } from 'lucide-react'
import { ApiError, apiFetch } from '@/lib/api'
import type { PatientUser } from '@/lib/patient-chart/api'
import { isPatientAccessExpired, paymentAccessLabel } from '@/lib/patient-chart/billing'
import { FloatField } from '@/components/ui/FloatField'
import styles from './PatientChartAccountPanel.module.scss'

type Props = {
  user: PatientUser | null
  standalone?: boolean
  onEdit?: () => void
  onUpdated?: (user: PatientUser) => void
}

export function PatientChartAccountPanel({
  user,
  standalone = false,
  onEdit,
  onUpdated,
}: Props) {
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [plan, setPlan] = useState(String(user?.plan || 'MONTHLY'))
  const [accessExpiresAt, setAccessExpiresAt] = useState(
    user?.accessExpiresAt ? String(user.accessExpiresAt).slice(0, 10) : '',
  )

  const expired = isPatientAccessExpired(user?.accessExpiresAt)
  const paymentLabel = paymentAccessLabel(user || {})

  const accessLabel = useMemo(() => {
    if (!user?.accessExpiresAt) return 'Sem data de expiração'
    return new Date(user.accessExpiresAt).toLocaleDateString('pt-BR')
  }, [user?.accessExpiresAt])

  async function patch(body: Record<string, unknown>, label: string) {
    if (!user?.id) return
    setBusy(label)
    setError('')
    setMessage('')
    try {
      const updated = await apiFetch<PatientUser>(`/users/${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      onUpdated?.(updated)
      setMessage('Atualizado com sucesso.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao atualizar.')
    } finally {
      setBusy('')
    }
  }

  async function resend(channel: 'email' | 'whatsapp') {
    if (!user?.id) return
    setBusy(channel)
    setError('')
    setMessage('')
    try {
      await apiFetch(`/users/${encodeURIComponent(user.id)}/resend-approval`, {
        method: 'POST',
        body: JSON.stringify({ channel }),
      })
      setMessage(channel === 'email' ? 'E-mail reenviado.' : 'WhatsApp reenviado.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao reenviar.')
    } finally {
      setBusy('')
    }
  }

  if (!user) return null

  return (
    <section className={`${styles.panel} ${standalone ? styles.standalone : ''}`}>
      <header className={styles.head}>
        <div>
          <h3>{standalone ? 'Pagamentos e acesso' : 'Conta e acesso'}</h3>
          <p>
            Plano {String(user.plan || 'FREE')} · Pagamento: {paymentLabel} · Acesso até{' '}
            {accessLabel}
            {expired ? ' (expirado)' : ''}
          </p>
        </div>
        {onEdit ? (
          <button type="button" className="btn-secondary" onClick={onEdit}>
            <Pencil size={14} aria-hidden />
            Editar
          </button>
        ) : null}
      </header>

      <div className={styles.grid}>
        <FloatField
          as="select"
          label="Plano"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
        >
          <option value="FREE">Sem plano / Free</option>
          <option value="MONTHLY">Mensal</option>
          <option value="YEARLY">Anual</option>
          <option value="PREMIUM">Essencial</option>
          <option value="PLATINUM">Completo</option>
        </FloatField>
        <FloatField
          label="Acesso até"
          type="date"
          value={accessExpiresAt}
          onChange={(e) => setAccessExpiresAt(e.target.value)}
        />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className="btn-primary"
          disabled={Boolean(busy)}
          onClick={() =>
            void patch(
              {
                plan,
                accessExpiresAt: accessExpiresAt
                  ? new Date(`${accessExpiresAt}T23:59:59`).toISOString()
                  : null,
              },
              'save',
            )
          }
        >
          <RefreshCw size={14} aria-hidden />
          {busy === 'save' ? 'Salvando…' : 'Salvar acesso'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={Boolean(busy)}
          onClick={() => void resend('email')}
        >
          <Mail size={14} aria-hidden />
          {busy === 'email' ? 'Enviando…' : 'Reenviar e-mail'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={Boolean(busy)}
          onClick={() => void resend('whatsapp')}
        >
          <MessageCircle size={14} aria-hidden />
          {busy === 'whatsapp' ? 'Enviando…' : 'Reenviar WhatsApp'}
        </button>
      </div>

      {message ? <p className={styles.ok}>{message}</p> : null}
      {error ? <p className={styles.err}>{error}</p> : null}
    </section>
  )
}
