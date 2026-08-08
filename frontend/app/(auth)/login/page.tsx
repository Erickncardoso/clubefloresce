'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lock, Mail } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { login, verifyAuthSession } from '@/lib/auth'
import { FloatField } from '@/components/ui/FloatField'
import styles from './login.module.scss'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const user = await verifyAuthSession({ requiredRole: 'NUTRICIONISTA' })
      if (!alive) return
      if (user) {
        router.replace('/dashboard')
        return
      }
      setChecking(false)
    })()
    return () => {
      alive = false
    }
  }, [router])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await login(email.trim(), password)
      if (data.user.role !== 'NUTRICIONISTA') {
        setError('Acesso exclusivo para nutricionistas. Pacientes devem usar o app Clube Florescer.')
        return
      }
      router.replace('/dashboard')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Credenciais inválidas. Verifique e-mail e senha.')
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao entrar.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return <div className={styles.checking}>Verificando sessão…</div>
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
          <header className={styles.header}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logovetorcarregamento.svg" alt="Florescer" width={28} height={40} />
            <h2>Bem-vindo de volta</h2>
            <p>Insira suas credenciais para acessar o portal.</p>
          </header>

          <form className={`${styles.form} admin-form-fields`} onSubmit={onSubmit}>
            <FloatField
              id="portal-email"
              label="E-mail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@florescer.com"
              required
              icon={<Mail size={18} />}
            />

            <FloatField
              id="portal-password"
              label="Senha"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha de acesso"
              required
              icon={<Lock size={18} />}
            />

            {error ? <p className={styles.error}>{error}</p> : null}

            <button type="submit" className="btn-primary btn-auth-submit cf-squircle cf-squircle--control" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>

            <p className={styles.footerLink}>
              <Link href="/esqueci-senha">Esqueci a senha</Link>
            </p>

            <p className={styles.setupLink}>
              <Link href="/setup/nutricionista">Setup inicial</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}
