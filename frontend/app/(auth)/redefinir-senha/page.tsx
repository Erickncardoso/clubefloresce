'use client'

import { FormEvent, Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Lock } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { resetPassword, validatePasswordResetToken } from '@/lib/auth-password'
import { FloatField } from '@/components/ui/FloatField'
import styles from './redefinir-senha.module.scss'

function RedefinirSenhaInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [checking, setChecking] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [invalidMessage, setInvalidMessage] = useState('Link inválido ou expirado.')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!token) {
        if (!alive) return
        setChecking(false)
        setInvalidMessage('Link inválido. Solicite um novo e-mail de recuperação.')
        return
      }

      try {
        await validatePasswordResetToken(token)
        if (!alive) return
        setTokenValid(true)
      } catch (err) {
        if (!alive) return
        if (err instanceof ApiError) {
          setInvalidMessage(err.message || 'Link inválido ou expirado.')
        } else {
          setInvalidMessage('Link inválido ou expirado.')
        }
      } finally {
        if (alive) setChecking(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [token])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('A confirmação precisa ser igual à nova senha.')
      return
    }

    setLoading(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Não foi possível redefinir a senha.')
      } else {
        setError(err instanceof Error ? err.message : 'Não foi possível redefinir a senha.')
      }
    } finally {
      setLoading(false)
    }
  }

  const showForm = !checking && tokenValid && !done

  return (
    <div className={`${styles.page} auth-page`}>
      <aside className={styles.visual} aria-hidden>
        <span className={styles.badge}>Portal nutricionista · Next</span>
        <h1>
          Nutrição que <em>floresce</em> de dentro para fora.
        </h1>
        <p>Painel Next — mesmo backend do legado Nuxt.</p>
      </aside>

      <main className={styles.main}>
        <div className={`${styles.card} auth-card cf-squircle cf-squircle--surface`}>
          {showForm ? (
            <header className={styles.header}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/logovetorcarregamento.svg" alt="Florescer" width={28} height={40} />
              <h2>Nova senha</h2>
              <p>Escolha uma nova senha para sua conta.</p>
            </header>
          ) : null}

          {checking ? <div className={styles.status}>Validando link...</div> : null}

          {!checking && !tokenValid ? (
            <div className={styles.status}>
              <p>{invalidMessage}</p>
              <Link
                href="/esqueci-senha"
                className={`btn-primary btn-auth-submit cf-squircle cf-squircle--control ${styles.primaryLink}`}
              >
                Solicitar novo link
              </Link>
            </div>
          ) : null}

          {!checking && tokenValid && done ? (
            <div className={styles.status}>
              <p>Senha redefinida com sucesso. Você já pode entrar no portal.</p>
              <Link
                href="/login"
                className={`btn-primary btn-auth-submit cf-squircle cf-squircle--control ${styles.primaryLink}`}
              >
                Ir para o login
              </Link>
            </div>
          ) : null}

          {showForm ? (
            <form className={`${styles.form} admin-form-fields`} onSubmit={onSubmit}>
              <div className={styles.passwordRow}>
                <FloatField
                  id="reset-password"
                  label="Nova senha"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  icon={<Lock size={18} />}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                </button>
              </div>

              <FloatField
                id="reset-confirm"
                label="Confirmar senha"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                required
                minLength={8}
                icon={<Lock size={18} />}
              />

              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                className="btn-primary btn-auth-submit cf-squircle cf-squircle--control"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </button>
            </form>
          ) : null}
        </div>
      </main>
    </div>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={<div className={styles.main}>Validando link...</div>}>
      <RedefinirSenhaInner />
    </Suspense>
  )
}
