'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import {
  CalendarDays,
  CreditCard,
  KeyRound,
  Mail,
  MessageCircle,
  Pencil,
  RefreshCw,
  Shield,
} from 'lucide-react'
import { ApiError, apiFetch } from '@/lib/api'
import type { PatientUser } from '@/lib/patient-chart/api'
import { isPatientAccessExpired, paymentAccessLabel } from '@/lib/patient-chart/billing'
import { AppModal } from '@/components/overlays'
import { CfDateInput } from '@/components/ui/CfDateInput'
import { CfSelect } from '@/components/ui/CfSelect'
import styles from './PatientChartAccountPanel.module.scss'

const PLAN_OPTIONS = [
  { value: 'FREE', label: 'Sem plano / Free' },
  { value: 'MONTHLY', label: 'Mensal' },
  { value: 'YEARLY', label: 'Anual' },
  { value: 'PREMIUM', label: 'Essencial' },
  { value: 'PLATINUM', label: 'Completo' },
]

type Props = {
  user: PatientUser | null
  standalone?: boolean
  onEdit?: () => void
  onUpdated?: (user: PatientUser) => void
}

function planLabel(plan?: string | null) {
  return PLAN_OPTIONS.find((o) => o.value === String(plan || 'FREE').toUpperCase())?.label
    || String(plan || 'FREE')
}

export function PatientChartAccountPanel({
  user,
  standalone = false,
  onEdit,
  onUpdated,
}: Props) {
  const planFieldId = useId()
  const dateFieldId = useId()
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [accessOpen, setAccessOpen] = useState(false)
  const [plan, setPlan] = useState(String(user?.plan || 'MONTHLY'))
  const [accessExpiresAt, setAccessExpiresAt] = useState(
    user?.accessExpiresAt ? String(user.accessExpiresAt).slice(0, 10) : '',
  )

  useEffect(() => {
    setPlan(String(user?.plan || 'MONTHLY'))
    setAccessExpiresAt(user?.accessExpiresAt ? String(user.accessExpiresAt).slice(0, 10) : '')
  }, [user?.id, user?.plan, user?.accessExpiresAt])

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
      setAccessOpen(false)
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
    <section className={`${styles.pcap} ${standalone ? styles.pcapStandalone : ''}`}>
      <header className={styles.pcapHead}>
        <div className={styles.pcapHeadMain}>
          <span className={styles.pcapIcon} aria-hidden>
            <Shield size={16} />
          </span>
          <div>
            <h3>{standalone ? 'Pagamentos e acesso' : 'Conta e acesso'}</h3>
            <p>
              Plano {String(user.plan || 'FREE')} · Pagamento: {paymentLabel} · Acesso até{' '}
              {accessLabel}
              {expired ? ' (expirado)' : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          className={styles.pcapEdit}
          onClick={() => {
            setError('')
            setMessage('')
            setAccessOpen(true)
          }}
        >
          <Pencil size={14} aria-hidden />
          Editar acesso
        </button>
      </header>

      <div className={styles.pcapGrid}>
        <div className={styles.pcapTile}>
          <span className={styles.pcapTileLabel}>
            <KeyRound size={12} aria-hidden />
            Plano
          </span>
          <span className={styles.pcapTileValue}>{planLabel(user.plan)}</span>
        </div>
        <div className={styles.pcapTile}>
          <span className={styles.pcapTileLabel}>
            <CreditCard size={12} aria-hidden />
            Pagamento
          </span>
          <span className={`${styles.pcapTileValue} ${styles.pcapTileValueOk}`}>
            {paymentLabel}
          </span>
        </div>
        <div className={styles.pcapTile}>
          <span className={styles.pcapTileLabel}>
            <CalendarDays size={12} aria-hidden />
            Acesso até
          </span>
          <span className={styles.pcapTileValue}>{accessLabel}</span>
          <small>
            {expired ? (
              <span className={`${styles.pcapBadge} ${styles.pcapBadgeDanger}`}>Expirado</span>
            ) : (
              <span className={`${styles.pcapBadge} ${styles.pcapBadgeOk}`}>Ativo</span>
            )}
          </small>
        </div>
      </div>

      <div className={styles.pcapApprovals}>
        <div className={styles.pcapApproval}>
          <header>
            <Mail />
            <div>
              <h4>Convite por e-mail</h4>
              <p className={styles.pcapMuted}>Reenvia o link de acesso ao paciente.</p>
            </div>
          </header>
          <div className={styles.pcapApprovalActions}>
            <button
              type="button"
              className={styles.pcapBtn}
              disabled={Boolean(busy)}
              onClick={() => void resend('email')}
            >
              <Mail size={13} aria-hidden />
              {busy === 'email' ? 'Enviando…' : 'Reenviar e-mail'}
            </button>
          </div>
        </div>
        <div className={styles.pcapApproval}>
          <header>
            <MessageCircle />
            <div>
              <h4>Convite por WhatsApp</h4>
              <p className={styles.pcapMuted}>Reenvia a mensagem de aprovação.</p>
            </div>
          </header>
          <div className={styles.pcapApprovalActions}>
            <button
              type="button"
              className={`${styles.pcapBtn} ${styles.pcapBtnGhost}`}
              disabled={Boolean(busy)}
              onClick={() => void resend('whatsapp')}
            >
              <MessageCircle size={13} aria-hidden />
              {busy === 'whatsapp' ? 'Enviando…' : 'Reenviar WhatsApp'}
            </button>
            {onEdit ? (
              <button type="button" className={`${styles.pcapBtn} ${styles.pcapBtnGhost}`} onClick={onEdit}>
                <Pencil size={13} aria-hidden />
                Editar cadastro
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {message ? <p className={styles.pcapOk}>{message}</p> : null}
      {error && !accessOpen ? <p className={styles.pcapError}>{error}</p> : null}

      <AppModal
        open={accessOpen}
        onOpenChange={setAccessOpen}
        title="Editar acesso"
        description="Ajuste o plano e a data de validade do acesso do paciente."
      >
        <div className="admin-form-fields" style={{ display: 'grid', gap: '0.85rem' }}>
          <div className="field field--float">
            <label htmlFor={planFieldId}>Plano</label>
            <CfSelect
              id={planFieldId}
              value={plan}
              onChange={setPlan}
              options={PLAN_OPTIONS}
            />
          </div>

          <div className="field field--float">
            <label htmlFor={dateFieldId}>Acesso até</label>
            <CfDateInput
              id={dateFieldId}
              value={accessExpiresAt}
              onChange={setAccessExpiresAt}
              editable
            />
          </div>

          <p className={styles.pcapMuted} style={{ margin: 0, fontSize: '0.75rem' }}>
            Deixe em branco para acesso sem data limite. Data no passado remove o acesso
            imediatamente.
          </p>

          {error ? <p className={styles.pcapError}>{error}</p> : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              disabled={Boolean(busy)}
              onClick={() => setAccessOpen(false)}
            >
              Cancelar
            </button>
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
          </div>
        </div>
      </AppModal>
    </section>
  )
}
