'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, Camera, Loader2 } from 'lucide-react'
import {
  ApiError,
  disconnectInstagram,
  fetchInstagramOauthUrl,
  fetchInstagramStatus,
  type InstagramStatus,
} from '@/lib/instagram/api'
import styles from './instagram.module.scss'

const EMPTY_STATUS: InstagramStatus = {
  appConfigured: false,
  connected: false,
  username: null,
  profilePictureUrl: null,
  tokenExpiresAt: null,
}

function formatDate(value: string | null): string {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  } catch {
    return ''
  }
}

function InstagramConexaoInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [status, setStatus] = useState<InstagramStatus>(EMPTY_STATUS)
  const [flash, setFlash] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [avatarBroken, setAvatarBroken] = useState(false)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setAvatarBroken(false)
    try {
      const next = await fetchInstagramStatus()
      setStatus(next)
    } catch (err) {
      console.error('[Instagram] status', err)
      setFlash({ type: 'err', text: 'Não foi possível carregar o status da conexão.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const conectado = searchParams.get('conectado')
    const erro = searchParams.get('erro')
    if (conectado) {
      setFlash({ type: 'ok', text: `Conta @${conectado} conectada!` })
      router.replace('/instagram', { scroll: false })
    } else if (erro) {
      setFlash({ type: 'err', text: erro })
      router.replace('/instagram', { scroll: false })
    }
    void loadStatus()
  }, [loadStatus, router, searchParams])

  async function connect() {
    setActionLoading(true)
    try {
      const url = await fetchInstagramOauthUrl()
      if (!url) throw new Error('URL de autorização vazia.')
      window.location.href = url
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Não foi possível iniciar a conexão.'
      setFlash({ type: 'err', text: message })
      setActionLoading(false)
    }
  }

  async function disconnect() {
    setActionLoading(true)
    try {
      await disconnectInstagram()
      setFlash({ type: 'ok', text: 'Conta desconectada.' })
      await loadStatus()
    } catch {
      setFlash({ type: 'err', text: 'Falha ao desconectar.' })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <h1>Conexão Instagram</h1>
          <p>
            Conecte sua conta profissional para responder comentários e stories com DM automática.
          </p>
        </div>
        <span
          className={`${styles.statusPill} ${status.connected ? styles.statusOn : styles.statusOff}`}
        >
          <span className={styles.statusDot} aria-hidden />
          {status.connected ? 'Conectado' : 'Desconectado'}
        </span>
      </header>

      <div className={styles.grid}>
        <section className={styles.card}>
          {flash ? (
            <div
              className={`${styles.flash} ${flash.type === 'ok' ? styles.flashOk : styles.flashErr}`}
              role="status"
            >
              {flash.text}
            </div>
          ) : null}

          {loading ? (
            <div className={styles.state}>
              <Loader2 className={styles.spin} size={32} aria-hidden />
              <p>Verificando conexão…</p>
            </div>
          ) : !status.appConfigured ? (
            <div className={styles.state}>
              <AlertTriangle size={32} aria-hidden />
              <h2>App da Meta ainda não configurado</h2>
              <p>
                Falta preencher <code>INSTAGRAM_APP_ID</code>, <code>INSTAGRAM_APP_SECRET</code> e{' '}
                <code>INSTAGRAM_WEBHOOK_VERIFY_TOKEN</code> no <code>.env</code> do backend. Siga o
                guia da Meta antes de conectar.
              </p>
            </div>
          ) : status.connected ? (
            <div className={`${styles.state} ${styles.stateConnected}`}>
              <div className={styles.profile}>
                <div className={styles.avatarWrap}>
                  {status.profilePictureUrl && !avatarBroken ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={status.profilePictureUrl}
                      className={styles.avatar}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarBroken(true)}
                    />
                  ) : (
                    <div className={styles.avatarFallback}>
                      <Camera size={28} />
                    </div>
                  )}
                </div>
                <div className={styles.profileText}>
                  <p className={styles.kicker}>Conta conectada</p>
                  <h2>@{status.username}</h2>
                  {status.tokenExpiresAt ? (
                    <p className={styles.subline}>
                      Acesso renovado automaticamente (expira {formatDate(status.tokenExpiresAt)})
                    </p>
                  ) : null}
                </div>
              </div>
              <div className={styles.actions}>
                <Link href="/instagram/automacoes" className="btn-primary">
                  Gerenciar automações
                </Link>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={actionLoading}
                  onClick={() => void disconnect()}
                >
                  {actionLoading ? <Loader2 className={styles.spin} size={16} /> : null}
                  Desconectar
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.state}>
              <div className={styles.emptyIcon} aria-hidden>
                <Camera size={36} />
              </div>
              <h2>Nenhuma conta conectada</h2>
              <p>
                Conecte a conta profissional que você quer automatizar. Você será levada ao Instagram
                para autorizar.
              </p>
              <button
                type="button"
                className="btn-primary"
                disabled={actionLoading}
                onClick={() => void connect()}
              >
                {actionLoading ? <Loader2 className={styles.spin} size={16} /> : null}
                Conectar Instagram
              </button>
            </div>
          )}
        </section>

        <aside className={styles.card}>
          <h3>Como funciona</h3>
          <ul className={styles.tips}>
            <li>
              <strong>Comentário → DM</strong>
              <span>
                Alguém comenta a palavra-chave no seu post ou reels e recebe sua mensagem no privado.
              </span>
            </li>
            <li>
              <strong>Story e DM</strong>
              <span>Também funciona quando respondem seu story ou mandam a palavra na DM.</span>
            </li>
            <li>
              <strong>Sem spam</strong>
              <span>
                Só responde quem interage — nada de mensagem em massa (isso derruba a conta).
              </span>
            </li>
            <li>
              <strong>Conexão oficial</strong>
              <span>Login direto pela Meta, sem senha salva aqui.</span>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  )
}

export default function InstagramConexaoPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <div className={styles.card}>
            <div className={styles.state}>
              <Loader2 className={styles.spin} size={32} aria-hidden />
              <p>Carregando…</p>
            </div>
          </div>
        </div>
      }
    >
      <InstagramConexaoInner />
    </Suspense>
  )
}
