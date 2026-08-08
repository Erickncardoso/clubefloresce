'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { forgotPassword } from '@/lib/auth-password'
import { FloatField } from '@/components/ui/FloatField'
import styles from './esqueci-senha.module.scss'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await forgotPassword(email.trim())
      setSubmitted(true)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Não foi possível enviar o e-mail. Tente novamente.')
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Não foi possível enviar o e-mail. Tente novamente.',
        )
      }
    } finally {
      setLoading(false)
    }
  }

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
          {submitted ? (
            <div className={styles.success}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/logovetorcarregamento.svg" alt="Florescer" width={28} height={40} />
              <h2>Verifique seu e-mail</h2>
              <p>
                Se o e-mail estiver cadastrado, você receberá um link em instantes. Confira também a
                caixa de spam.
              </p>
              <Link
                href="/login"
                className={`btn-primary btn-auth-submit cf-squircle cf-squircle--control ${styles.primaryLink}`}
              >
                Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <header className={styles.header}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/logovetorcarregamento.svg" alt="Florescer" width={28} height={40} />
                <h2>Recuperar senha</h2>
                <p>Informe seu e-mail. Enviaremos um link válido por 10 minutos.</p>
              </header>

              <form className={`${styles.form} admin-form-fields`} onSubmit={onSubmit}>
                <FloatField
                  id="forgot-email"
                  label="E-mail"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  icon={<Mail size={18} />}
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
                  {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>

                <p className={styles.footerLink}>
                  <Link href="/login">Voltar ao login</Link>
                </p>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
