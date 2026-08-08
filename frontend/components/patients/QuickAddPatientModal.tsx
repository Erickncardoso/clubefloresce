'use client'

import { FormEvent, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { AuthUser } from '@/lib/types'
import { FloatField } from '@/components/ui/FloatField'
import styles from './QuickAddPatientModal.module.scss'

type Seed = {
  name?: string
  email?: string
  phone?: string
  plan?: string
} | null

type Props = {
  open: boolean
  mode?: 'create' | 'approve' | 'edit'
  seed?: Seed
  registrationRequestId?: string
  editUserId?: string
  onClose: () => void
  onCreated: (user: AuthUser) => void
}

export function QuickAddPatientModal({
  open,
  mode = 'create',
  seed = null,
  registrationRequestId = '',
  editUserId = '',
  onClose,
  onCreated,
}: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [plan, setPlan] = useState('MONTHLY')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setName(seed?.name || '')
    setEmail(seed?.email || '')
    setPhone(seed?.phone || '')
    setPassword('')
    setPlan(seed?.plan || 'MONTHLY')
    setError('')
  }, [open, seed])

  if (!open) return null

  const title =
    mode === 'approve' ? 'Aprovar acesso' : mode === 'edit' ? 'Editar paciente' : 'Novo paciente'
  const submitLabel =
    mode === 'approve' ? 'Aprovar' : mode === 'edit' ? 'Salvar' : 'Cadastrar'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      if (!name.trim() || !email.trim()) {
        throw new Error('Nome e e-mail são obrigatórios.')
      }
      if (mode === 'create' && !password.trim()) {
        throw new Error('Informe a senha inicial.')
      }

      const phoneDigits = phone.replace(/\D/g, '')

      if (mode === 'edit') {
        if (!editUserId) throw new Error('Paciente inválido para edição.')
        const body: Record<string, unknown> = {
          name: name.trim(),
          email: email.trim(),
          plan,
          phone: phoneDigits || null,
        }
        if (password.trim()) body.password = password.trim()
        const user = await apiFetch<AuthUser>(`/users/${encodeURIComponent(editUserId)}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
        onCreated(user)
        return
      }

      const body: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        plan,
        phone: phoneDigits || null,
        sendWelcomeWhatsapp: false,
      }

      if (registrationRequestId) {
        body.registrationRequestId = registrationRequestId
      } else {
        body.password = password
      }

      const user = await apiFetch<AuthUser>('/users', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      onCreated(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar paciente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={title}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden />
      <div className={`modal-card ${styles.card}`}>
        <header className={styles.head}>
          <div>
            <h2>{title}</h2>
            <p>
              {mode === 'edit'
                ? 'Atualize os dados cadastrais do paciente.'
                : 'Cadastro rápido — mesmo backend do Nuxt.'}
            </p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        <form className={`${styles.form} admin-form-fields`} onSubmit={onSubmit}>
          <FloatField
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
          <FloatField
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <FloatField
            label="Telefone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
          {mode === 'create' || mode === 'edit' ? (
            <FloatField
              label={mode === 'edit' ? 'Nova senha (opcional)' : 'Senha inicial'}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={mode === 'create'}
              autoComplete="new-password"
            />
          ) : null}
          <FloatField
            as="select"
            label="Plano"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          >
            <option value="MONTHLY">Mensal</option>
            <option value="YEARLY">Anual</option>
            <option value="FREE">Gratuito</option>
          </FloatField>

          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.actions}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Salvando…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
