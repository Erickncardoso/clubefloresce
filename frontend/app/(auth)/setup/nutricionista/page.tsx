'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { ApiError } from '@/lib/api'
import {
  createSetupNutricionista,
  fetchSetupNutricionistaStatus,
} from '@/lib/auth-password'
import styles from './setup.module.scss'

export default function SetupNutricionistaPage() {
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [setupEnabled, setSetupEnabled] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [setupKey, setSetupKey] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoadingStatus(true)
      try {
        const response = await fetchSetupNutricionistaStatus()
        if (!alive) return
        setSetupEnabled(Boolean(response?.enabled))
      } catch {
        if (!alive) return
        setError('Não foi possível validar o status do setup.')
        setSetupEnabled(false)
      } finally {
        if (alive) setLoadingStatus(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      await createSetupNutricionista(
        { name: name.trim(), email: email.trim(), password },
        setupKey.trim() || undefined,
      )
      setSuccess('Nutricionista criado com sucesso. Esta página foi desativada.')
      setSetupEnabled(false)
      setName('')
      setEmail('')
      setPassword('')
      setSetupKey('')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Não foi possível criar o nutricionista.')
      } else {
        setError(
          err instanceof Error ? err.message : 'Não foi possível criar o nutricionista.',
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  const formDisabled = !setupEnabled || submitting || Boolean(success)

  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <h1 className={styles.title}>Setup Inicial do Nutricionista</h1>
        <p className={styles.subtitle}>
          Esta página funciona apenas uma vez. Após o primeiro cadastro, ela será desativada.
        </p>

        {loadingStatus ? <div className={styles.status}>Verificando status do setup...</div> : null}

        {!loadingStatus && !setupEnabled && !success ? (
          <div className={styles.statusDisabled}>
            Setup já utilizado. Já existe um nutricionista cadastrado.
          </div>
        ) : null}

        {!loadingStatus && (setupEnabled || success) ? (
          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.field}>
              <span>Nome</span>
              <input
                type="text"
                required
                placeholder="Nome do nutricionista"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={formDisabled}
              />
            </label>

            <label className={styles.field}>
              <span>E-mail</span>
              <input
                type="email"
                required
                placeholder="nutri@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={formDisabled}
              />
            </label>

            <label className={styles.field}>
              <span>Senha</span>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={formDisabled}
              />
            </label>

            <label className={styles.field}>
              <span>Chave de setup</span>
              <input
                type="text"
                placeholder="Obrigatória em produção"
                value={setupKey}
                onChange={(e) => setSetupKey(e.target.value)}
                disabled={formDisabled}
              />
            </label>

            <button className={styles.btn} type="submit" disabled={formDisabled || !setupEnabled}>
              {submitting ? 'Criando...' : 'Criar nutricionista'}
            </button>

            {error ? <p className={styles.messageError}>{error}</p> : null}
            {success ? <p className={styles.messageSuccess}>{success}</p> : null}
          </form>
        ) : null}

        {!loadingStatus && error && !setupEnabled && !success ? (
          <p className={styles.messageError}>{error}</p>
        ) : null}

        <p className={styles.loginLink}>
          <Link href="/login">Ir para o login</Link>
        </p>
      </main>
    </div>
  )
}
