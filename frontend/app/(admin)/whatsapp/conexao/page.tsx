'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle,
  Loader2,
  LogOut,
  RefreshCw,
  Scan,
  Settings,
  Smartphone,
} from 'lucide-react'
import {
  getWhatsappApiBase,
  getProxyBase,
  whatsappFetchInit,
  whatsappHasAuth,
  isWhatsappConnectedFromStatusPayload,
} from '@/lib/whatsapp/api'
import { getStoredSessionJid } from '@/lib/whatsapp/utils'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import styles from './conexao.module.scss'

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectionPhase = 'idle' | 'show_qr' | 'pairing' | 'connected'
type StatusValue = 'disconnected' | 'connecting' | 'connected' | 'error'

interface InstanceData {
  profileName?: string
  profile?: { name?: string }
  profilePicUrl?: string
  profilePictureUrl?: string
  image?: string
  imagePreview?: string
  jid?: string
  phone?: string
  owner?: string
  ownerJid?: string
  userId?: string
  plataform?: string
  isBusiness?: boolean
  lastDisconnectReason?: string
  chatbot_enabled?: boolean
  chatbot_ignoreGroups?: boolean
  chatbot_stopConversation?: string
  chatbot_stopMinutes?: number
}

interface FormSettings {
  chatbot_enabled: boolean
  chatbot_ignoreGroups: boolean
  chatbot_stopConversation: string
  chatbot_stopMinutes: number
}

interface StatusPayload {
  connectionStatus?: unknown
  instance?: Record<string, unknown>
  status?: Record<string, unknown>
  qrcode?: string
  qr?: string
  base64?: string
  profilePicUrl?: string
  profilePictureUrl?: string
  jid?: string
  sessionJid?: string
  sessionPurged?: boolean
  [key: string]: unknown
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QR_REFRESH_INTERVAL_SEC = 30

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractQrFromPayload(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const d = data as Record<string, unknown>
  const inst = (d.instance as Record<string, unknown> | null) || {}
  const statusObj = (d.status as Record<string, unknown> | null) || {}
  const candidates = [
    d.qrcode,
    d.qr,
    d.base64,
    inst.qrcode,
    inst.qr,
    statusObj.qrcode,
    statusObj.QRCode,
  ]
  for (const candidate of candidates) {
    const value = typeof candidate === 'string' ? candidate.trim() : ''
    if (value) return value
  }
  return ''
}

function resolveConnectedSessionJidFromStatus(data: StatusPayload): string {
  if (!data) return ''
  const inst = (data.instance as Record<string, unknown>) || {}
  const statusObj = (data.status as Record<string, unknown>) || {}
  const candidates: unknown[] = [
    data.jid,
    data.sessionJid,
    inst.jid,
    statusObj.jid,
    (statusObj.instance as Record<string, unknown> | undefined)?.jid,
  ]
  for (const c of candidates) {
    const s = String(c ?? '').trim()
    if (s && s.includes('@')) return s
  }
  return ''
}

function pickInstanceProfilePicUrl(inst: InstanceData | null): string {
  if (!inst) return ''
  const candidates: unknown[] = [
    inst.profilePicUrl,
    inst.profilePictureUrl,
    inst.image,
    inst.imagePreview,
  ]
  for (const c of candidates) {
    if (typeof c !== 'string') continue
    const s = c.trim()
    if (!s) continue
    if (/^https?:\/\//i.test(s) || s.startsWith('data:image')) return s
  }
  return ''
}

function formatPhoneLine(value: unknown): string {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`
  }
  return digits.startsWith('55') ? `+${digits}` : digits
}

function pickConnectedLineLabel(instance: InstanceData | null): string {
  if (!instance) return 'Sessão ativa'
  const profileName = String(
    instance.profileName ?? instance.profile?.name ?? '',
  ).trim()
  const jid = String(
    instance.jid ?? instance.phone ?? instance.owner ?? instance.ownerJid ?? instance.userId ?? '',
  ).trim()
  const phoneLine = formatPhoneLine(jid.replace(/@.+$/, ''))
  if (profileName && phoneLine && profileName !== phoneLine) return phoneLine
  if (phoneLine) return phoneLine
  if (profileName) return profileName
  return 'Sessão ativa'
}

function pickLastDisconnectReasonLabel(instance: InstanceData | null): string {
  const reason = instance?.lastDisconnectReason
  if (!reason || typeof reason !== 'string') return ''
  const normalized = reason.toLowerCase().trim()
  if (normalized.includes('connection attempt canceled by api')) return ''
  if (normalized.includes('logged out')) return 'Última sessão encerrada no celular.'
  if (normalized.includes('timed out')) return 'O tempo para escanear o QR expirou.'
  if (normalized.includes('connection closed')) return 'A conexão foi encerrada.'
  return reason
}

function normalizeConnectionStatus(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'object' && value) {
    const obj = value as Record<string, unknown>
    if (obj.connected === true || obj.loggedIn === true) return 'connected'
    if (obj.connecting === true) return 'connecting'
    return 'disconnected'
  }
  return String(value).toLowerCase()
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WhatsappConexaoPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [status, setStatus] = useState<StatusValue>('disconnected')
  const [connectionPhase, setConnectionPhase] = useState<ConnectionPhase>('idle')
  const [qrcode, setQrcode] = useState('')
  const [instanceData, setInstanceData] = useState<InstanceData | null>(null)
  const [qrRefreshCountdown, setQrRefreshCountdown] = useState(0)
  const [formSettings, setFormSettings] = useState<FormSettings>({
    chatbot_enabled: false,
    chatbot_ignoreGroups: true,
    chatbot_stopConversation: 'parar',
    chatbot_stopMinutes: 60,
  })

  const manualDisconnectRef = useRef(false)
  const awaitingQrScanUntilRef = useRef(0)
  const wasConnectedRef = useRef(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qrCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qrAutoRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const connectionPhaseRef = useRef<ConnectionPhase>('idle')

  // Keep ref in sync for use inside intervals
  const syncPhaseRef = useCallback((phase: ConnectionPhase) => {
    connectionPhaseRef.current = phase
    setConnectionPhase(phase)
  }, [])

  // ─── Status label / pill tone ──────────────────────────────────────────────

  function getStatusLabel(phase: ConnectionPhase, s: StatusValue, isLoading: boolean): string {
    if (isLoading) return 'Verificando'
    if (phase === 'connected' || s === 'connected') return 'Conectado'
    if (phase === 'pairing') return 'Conectando'
    if (phase === 'show_qr') return 'Aguardando scan'
    if (s === 'error') return 'Erro'
    return 'Desconectado'
  }

  function getStatusPillTone(phase: ConnectionPhase, s: StatusValue): string {
    if (phase === 'connected' || s === 'connected') return 'connected'
    if (phase === 'pairing' || phase === 'show_qr') return 'connecting'
    if (s === 'error') return 'error'
    return 'disconnected'
  }

  // ─── QR Refresh timers ────────────────────────────────────────────────────

  const stopQrRefreshTimers = useCallback(() => {
    if (qrCountdownIntervalRef.current) {
      clearInterval(qrCountdownIntervalRef.current)
      qrCountdownIntervalRef.current = null
    }
    if (qrAutoRefreshIntervalRef.current) {
      clearInterval(qrAutoRefreshIntervalRef.current)
      qrAutoRefreshIntervalRef.current = null
    }
    setQrRefreshCountdown(0)
  }, [])

  const refreshQrCodeAuto = useCallback(async () => {
    if (connectionPhaseRef.current !== 'show_qr') return
    try {
      const base = getWhatsappApiBase()
      const res = await fetch(
        `${base}/connect/refresh-qr`,
        whatsappFetchInit({ method: 'POST' }),
      )
      const data = (await res.json().catch(() => ({}))) as StatusPayload
      if (!res.ok) throw new Error((data as { message?: string }).message ?? 'Falha ao atualizar QR Code')

      if (data.connectionStatus === 'qrreadsuccess') {
        syncPhaseRef('pairing')
        setStatus('connecting')
        setQrcode('')
        stopQrRefreshTimers()
        return
      }

      const qr = extractQrFromPayload(data)
      if (qr) {
        setQrcode(qr)
        setQrRefreshCountdown(QR_REFRESH_INTERVAL_SEC)
      }
    } catch (e) {
      console.warn('refreshQrCodeAuto:', e)
      setQrRefreshCountdown(QR_REFRESH_INTERVAL_SEC)
    }
  }, [stopQrRefreshTimers, syncPhaseRef])

  const startQrRefreshTimers = useCallback(() => {
    if (connectionPhaseRef.current !== 'show_qr') return
    if (qrCountdownIntervalRef.current && qrAutoRefreshIntervalRef.current) return

    stopQrRefreshTimers()
    setQrRefreshCountdown(QR_REFRESH_INTERVAL_SEC)

    qrCountdownIntervalRef.current = setInterval(() => {
      if (connectionPhaseRef.current !== 'show_qr') {
        stopQrRefreshTimers()
        return
      }
      setQrRefreshCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    qrAutoRefreshIntervalRef.current = setInterval(() => {
      if (connectionPhaseRef.current === 'show_qr') {
        void refreshQrCodeAuto()
      }
    }, QR_REFRESH_INTERVAL_SEC * 1000)
  }, [stopQrRefreshTimers, refreshQrCodeAuto])

  // ─── Polling ──────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  // ─── Apply connection state ────────────────────────────────────────────────

  const applyConnectionState = useCallback(
    ({
      isConnected,
      normalizedStatus,
      isQrAlreadyRead,
      hasQr,
    }: {
      isConnected: boolean
      normalizedStatus: string
      isQrAlreadyRead: boolean
      hasQr: boolean
    }) => {
      if (isConnected) {
        syncPhaseRef('connected')
        setStatus('connected')
        setQrcode('')
        manualDisconnectRef.current = false
        awaitingQrScanUntilRef.current = 0
        stopQrRefreshTimers()
        return
      }

      if (isQrAlreadyRead || normalizedStatus === 'qrreadsuccess') {
        syncPhaseRef('pairing')
        setStatus('connecting')
        setQrcode('')
        stopQrRefreshTimers()
        return
      }

      const awaitingScan =
        normalizedStatus === 'connecting' ||
        hasQr ||
        Date.now() < awaitingQrScanUntilRef.current

      if (awaitingScan && !manualDisconnectRef.current) {
        syncPhaseRef('show_qr')
        setStatus('connecting')
        startQrRefreshTimers()
        return
      }

      syncPhaseRef('idle')
      setStatus('disconnected')
      setQrcode('')
      awaitingQrScanUntilRef.current = 0
      stopQrRefreshTimers()
    },
    [syncPhaseRef, stopQrRefreshTimers, startQrRefreshTimers],
  )

  // ─── fetchStatus ──────────────────────────────────────────────────────────

  const fetchStatus = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 12000)
      try {
        if (!silent) setActionLoading(true)
        const base = getWhatsappApiBase()
        const res = await fetch(
          `${base}/status`,
          whatsappFetchInit({ signal: controller.signal }),
        )
        const data = (await res.json().catch(() => ({}))) as StatusPayload
        if (!res.ok) {
          const msg = (data as { message?: string }).message ?? `Falha ao consultar status (${res.status})`
          throw new Error(msg)
        }

        const inst = (data.instance as InstanceData | null) ?? null
        const merged: InstanceData = {
          ...(inst ?? {}),
          profilePicUrl: String(data.profilePicUrl ?? inst?.profilePicUrl ?? ''),
          profilePictureUrl: String(data.profilePictureUrl ?? inst?.profilePictureUrl ?? ''),
          jid: String(data.jid ?? data.sessionJid ?? inst?.jid ?? ''),
        }
        setInstanceData(merged)

        const instRaw = inst as Record<string, unknown> | null
        const rawStatus =
          (data as Record<string, unknown>).connectionStatus ??
          instRaw?.connectionStatus ??
          instRaw?.status ??
          instRaw?.state ??
          (data.status as Record<string, unknown> | undefined)?.status ??
          ''

        const normalizedStatus = normalizeConnectionStatus(rawStatus)
        const isConnected = isWhatsappConnectedFromStatusPayload(data)
        const isQrAlreadyRead = normalizedStatus === 'qrreadsuccess'

        const nextQr =
          (data.qrcode as string | undefined) ??
          extractQrFromPayload(data) ??
          extractQrFromPayload(inst)
        if (!isQrAlreadyRead && nextQr) {
          setQrcode(nextQr)
        }

        applyConnectionState({
          isConnected,
          normalizedStatus,
          isQrAlreadyRead,
          hasQr: Boolean(nextQr || qrcode),
        })

        if (isConnected) {
          const sessionJid = resolveConnectedSessionJidFromStatus(data)
          const prevSessionJid = getStoredSessionJid()
          const sessionChanged = Boolean(
            data.sessionPurged ||
              (sessionJid && prevSessionJid && sessionJid !== prevSessionJid),
          )

          if (sessionJid && typeof window !== 'undefined') {
            localStorage.setItem('wa_session_jid', sessionJid)
          }

          if (!wasConnectedRef.current || sessionChanged) {
            wasConnectedRef.current = true
            if (sessionChanged && typeof window !== 'undefined') {
              localStorage.removeItem('wa_session_jid')
              if (sessionJid) localStorage.setItem('wa_session_jid', sessionJid)
            }
          }
        } else {
          wasConnectedRef.current = false
        }

        if (inst) {
          setFormSettings({
            chatbot_enabled: Boolean(inst.chatbot_enabled),
            chatbot_ignoreGroups: inst.chatbot_ignoreGroups ?? true,
            chatbot_stopConversation:
              typeof inst.chatbot_stopConversation === 'string'
                ? inst.chatbot_stopConversation
                : 'parar',
            chatbot_stopMinutes:
              typeof inst.chatbot_stopMinutes === 'number' ? inst.chatbot_stopMinutes : 60,
          })
        }
      } catch (e) {
        console.error('fetchStatus error:', e)
        setStatus('error')
        syncPhaseRef('idle')
        stopQrRefreshTimers()
      } finally {
        clearTimeout(timer)
        setLoading(false)
        if (!silent) setActionLoading(false)
        // Decide whether to poll
        const phase = connectionPhaseRef.current
        const shouldPoll =
          phase === 'show_qr' ||
          phase === 'pairing' ||
          Date.now() < awaitingQrScanUntilRef.current
        if (shouldPoll) {
          if (!pollIntervalRef.current) {
            pollIntervalRef.current = setInterval(() => {
              void fetchStatus({ silent: true })
            }, 3000)
          }
        } else {
          stopPolling()
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applyConnectionState, syncPhaseRef, stopQrRefreshTimers, stopPolling],
  )

  // ─── generateQrCode ───────────────────────────────────────────────────────

  const generateQrCode = useCallback(async () => {
    try {
      if (connectionPhaseRef.current === 'connected') {
        window.alert('Você já está conectado. Desconecte a sessão antes de gerar um novo QR.')
        return
      }

      setActionLoading(true)
      manualDisconnectRef.current = false

      const base = getWhatsappApiBase()
      const res = await fetch(
        `${base}/connect/regenerate-qr`,
        whatsappFetchInit({ method: 'POST' }),
      )
      const data = (await res.json().catch(() => ({}))) as StatusPayload
      if (!res.ok) throw new Error((data as { message?: string }).message ?? 'Falha ao gerar QR Code')

      if (data.connectionStatus === 'qrreadsuccess') {
        applyConnectionState({
          isConnected: false,
          normalizedStatus: 'qrreadsuccess',
          isQrAlreadyRead: true,
          hasQr: false,
        })
        void fetchStatus({ silent: true })
        return
      }

      const qr = extractQrFromPayload(data)
      if (qr) setQrcode(qr)

      syncPhaseRef('show_qr')
      setStatus('connecting')
      awaitingQrScanUntilRef.current = Date.now() + 180_000
      startQrRefreshTimers()

      if (!qr) {
        void fetchStatus()
      } else {
        // start polling
        if (!pollIntervalRef.current) {
          pollIntervalRef.current = setInterval(() => {
            void fetchStatus({ silent: true })
          }, 3000)
        }
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Não foi possível gerar o QR Code.')
    } finally {
      setActionLoading(false)
    }
  }, [applyConnectionState, fetchStatus, syncPhaseRef, startQrRefreshTimers])

  // ─── refreshQrCodeManual ──────────────────────────────────────────────────

  const refreshQrCodeManual = useCallback(async () => {
    if (connectionPhaseRef.current !== 'show_qr') return
    try {
      setActionLoading(true)
      await refreshQrCodeAuto()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Não foi possível atualizar o QR Code.')
    } finally {
      setActionLoading(false)
    }
  }, [refreshQrCodeAuto])

  // ─── disconnectWhatsApp ───────────────────────────────────────────────────

  const disconnectWhatsApp = useCallback(async () => {
    if (!window.confirm('Tem certeza que deseja desconectar o WhatsApp?')) return
    try {
      setActionLoading(true)
      manualDisconnectRef.current = true

      const base = getWhatsappApiBase()
      const res = await fetch(
        `${base}/disconnect`,
        whatsappFetchInit({ method: 'POST' }),
      )
      const data = (await res.json().catch(() => ({}))) as { message?: string }
      if (!res.ok) throw new Error(data.message ?? 'Falha ao desconectar')

      if (typeof window !== 'undefined') {
        localStorage.removeItem('wa_session_jid')
      }

      setStatus('disconnected')
      syncPhaseRef('idle')
      setQrcode('')
      awaitingQrScanUntilRef.current = 0
      stopQrRefreshTimers()

      await new Promise((resolve) => setTimeout(resolve, 1000))
      await fetchStatus()
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : 'Não foi possível desconectar.',
      )
      setStatus('disconnected')
    } finally {
      setActionLoading(false)
      stopPolling()
    }
  }, [syncPhaseRef, stopQrRefreshTimers, stopPolling, fetchStatus])

  const cancelConnection = useCallback(async () => {
    if (!window.confirm('Cancelar a conexão e voltar?')) return
    await disconnectWhatsApp()
  }, [disconnectWhatsApp])

  // ─── saveSettings ─────────────────────────────────────────────────────────

  const saveSettings = useCallback(async (settings: FormSettings) => {
    try {
      const proxy = getProxyBase()
      await fetch(
        `${proxy}/instance/settings`,
        whatsappFetchInit({
          method: 'POST',
          body: JSON.stringify(settings),
        }),
      )
    } catch (e) {
      console.error('Falha ao salvar config', e)
    }
  }, [])

  // ─── Mount / Unmount ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!whatsappHasAuth()) {
      router.replace('/')
      return
    }
    void fetchStatus()
    return () => {
      stopPolling()
      stopQrRefreshTimers()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Derived values ───────────────────────────────────────────────────────

  const statusLabel = getStatusLabel(connectionPhase, status, loading)
  const pillTone = getStatusPillTone(connectionPhase, status)
  const connectedLineLabel = pickConnectedLineLabel(instanceData)
  const instanceProfilePicUrl = pickInstanceProfilePicUrl(instanceData)
  const lastDisconnectReasonLabel = pickLastDisconnectReasonLabel(instanceData)

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={`${styles.page} admin-shell`}>
      <header className={`admin-shell-header ${styles.header}`}>
        <div className={styles.headerCopy}>
          <div className={styles.titleRow}>
            <span className={styles.brandMark} aria-hidden="true">
              <WhatsAppIcon />
            </span>
            <h1>Conexão WhatsApp</h1>
          </div>
          <p>
            Conecte seu número para atender pacientes, enviar check-ins e usar o chat integrado.
          </p>
        </div>
        <span className={`${styles.statusPill} ${styles[`statusPill--${pillTone}`]}`}>
          <span className={styles.statusDot} aria-hidden="true" />
          {statusLabel}
        </span>
      </header>

      <div className={styles.grid}>
        {/* ── Main card ─────────────────────────────────────────────────── */}
        <section className={`admin-shell-card ${styles.main}`}>
          {/* Loading */}
          {loading ? (
            <div className={styles.state}>
              <div className={styles.loader} aria-hidden="true" />
              <h2>Verificando conexão</h2>
              <p>Consultando o status da sua sessão WhatsApp…</p>
            </div>
          ) : connectionPhase === 'connected' ? (
            /* Connected */
            <div className={`${styles.state} ${styles.stateConnected}`}>
              <div className={styles.connectedHero}>
                <div className={styles.avatarWrap}>
                  {instanceProfilePicUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={instanceProfilePicUrl} className={styles.avatar} alt="" />
                  ) : (
                    <div className={`${styles.avatar} ${styles.avatarFallback}`}>
                      <CheckCircle className={styles.iconLg} />
                    </div>
                  )}
                  <span className={styles.avatarBadge} aria-hidden="true" />
                </div>
                <div className={styles.connectedCopy}>
                  <p className={styles.kicker}>Sessão ativa</p>
                  <h2>{instanceData?.profileName ?? 'WhatsApp conectado'}</h2>
                  <p className={styles.subline}>{connectedLineLabel}</p>
                </div>
              </div>

              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Plataforma</span>
                  <span className={styles.statValue}>{instanceData?.plataform ?? 'WhatsApp'}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Conta Business</span>
                  <span className={styles.statValue}>
                    {instanceData?.isBusiness ? 'Sim' : 'Pessoal'}
                  </span>
                </div>
              </div>

              <div className={styles.actions}>
                <Link href="/whatsapp/chat" className={`btn-primary ${styles.btn}`}>
                  Abrir conversas
                </Link>
                <button
                  type="button"
                  className={`btn-secondary ${styles.btn} ${styles.btnDanger}`}
                  disabled={actionLoading}
                  onClick={() => void disconnectWhatsApp()}
                >
                  {actionLoading ? (
                    <Loader2 className={`${styles.spin} ${styles.iconSm}`} />
                  ) : (
                    <LogOut className={styles.iconSm} />
                  )}
                  Desconectar
                </button>
              </div>
            </div>
          ) : connectionPhase === 'pairing' ? (
            /* Pairing */
            <div className={`${styles.state} ${styles.statePairing}`}>
              <div className={styles.loader} aria-hidden="true" />
              <div className={styles.stateHead}>
                <h2>Sincronizando…</h2>
                <p>QR Code escaneado. Estamos vinculando seu WhatsApp e importando conversas.</p>
              </div>
              <p className={styles.pairingHint}>
                <strong>Mantenha o celular aberto com o WhatsApp ativo</strong> até a sincronização
                terminar. Não feche o app no aparelho — isso pausa a importação das conversas.
              </p>
              <div className={`${styles.actions} ${styles.actionsCenter}`}>
                <button
                  type="button"
                  className={`btn-secondary ${styles.btn}`}
                  disabled={actionLoading}
                  onClick={() => void cancelConnection()}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : connectionPhase === 'show_qr' ? (
            /* Show QR */
            <div className={`${styles.state} ${styles.stateQr}`}>
              <div className={styles.stateHead}>
                <h2>Escaneie o QR Code</h2>
                <p>Use o WhatsApp do celular para concluir a conexão.</p>
              </div>

              <ol className={styles.steps}>
                <li>
                  <span>1</span> Abra o WhatsApp no celular
                </li>
                <li>
                  <span>2</span> Menu → Aparelhos conectados
                </li>
                <li>
                  <span>3</span> Conectar aparelho → escaneie
                </li>
              </ol>

              <div className={styles.qrFrame}>
                {qrcode ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrcode} alt="QR Code para conectar WhatsApp" className={styles.qrImg} />
                ) : (
                  <div className={styles.qrLoading}>
                    <Loader2 className={`${styles.spin} ${styles.iconLg}`} />
                    <span>Gerando QR Code…</span>
                  </div>
                )}
              </div>

              {qrRefreshCountdown > 0 ? (
                <p className={styles.qrCountdown}>
                  Novo QR Code em <strong>{qrRefreshCountdown}s</strong>
                </p>
              ) : null}

              <div className={`${styles.actions} ${styles.actionsCenter}`}>
                <button
                  type="button"
                  className={`btn-primary ${styles.btn}`}
                  disabled={actionLoading}
                  onClick={() => void refreshQrCodeManual()}
                >
                  <RefreshCw
                    className={`${actionLoading ? styles.spin : ''} ${styles.iconSm}`}
                  />
                  Atualizar agora
                </button>
                <button
                  type="button"
                  className={`btn-secondary ${styles.btn}`}
                  disabled={actionLoading}
                  onClick={() => void cancelConnection()}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            /* Idle / empty */
            <div className={`${styles.state} ${styles.stateEmpty}`}>
              <div className={styles.emptyIcon} aria-hidden="true">
                <Smartphone className={styles.iconXl} />
              </div>
              <h2>Nenhum aparelho conectado</h2>
              <p>O chat e as automações ficam pausados até você vincular seu WhatsApp.</p>

              {lastDisconnectReasonLabel ? (
                <div className={styles.alert}>{lastDisconnectReasonLabel}</div>
              ) : null}

              <button
                type="button"
                className={`btn-primary ${styles.btn} ${styles.btnWide}`}
                disabled={actionLoading}
                onClick={() => void generateQrCode()}
              >
                {actionLoading ? (
                  <Loader2 className={`${styles.spin} ${styles.iconSm}`} />
                ) : (
                  <Scan className={styles.iconSm} />
                )}
                Gerar QR Code
              </button>
            </div>
          )}
        </section>

        {/* ── Side panel ────────────────────────────────────────────────── */}
        {connectionPhase === 'connected' ? (
          <aside className={`admin-shell-card ${styles.side}`}>
            <div className={styles.sideHead}>
              <Settings className={styles.iconMd} />
              <div>
                <h3>Automação</h3>
                <p>Regras do assistente nesta linha.</p>
              </div>
            </div>

            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={formSettings.chatbot_enabled}
                onChange={(e) => {
                  const next = { ...formSettings, chatbot_enabled: e.target.checked }
                  setFormSettings(next)
                  void saveSettings(next)
                }}
              />
              <span className={styles.toggleTrack} aria-hidden="true" />
              <span className={styles.toggleCopy}>
                <strong>IA e fluxos automáticos</strong>
                <small>Respostas automáticas da Bella e fluxos configurados.</small>
              </span>
            </label>

            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={formSettings.chatbot_ignoreGroups}
                onChange={(e) => {
                  const next = { ...formSettings, chatbot_ignoreGroups: e.target.checked }
                  setFormSettings(next)
                  void saveSettings(next)
                }}
              />
              <span className={styles.toggleTrack} aria-hidden="true" />
              <span className={styles.toggleCopy}>
                <strong>Ignorar grupos</strong>
                <small>O robô não responde em conversas de grupo.</small>
              </span>
            </label>

            <div className={styles.field}>
              <label htmlFor="wa-stop-word">Palavra para pausar</label>
              <input
                id="wa-stop-word"
                type="text"
                className={styles.input}
                placeholder="parar, cancelar, atendente"
                value={formSettings.chatbot_stopConversation}
                onChange={(e) =>
                  setFormSettings((prev) => ({
                    ...prev,
                    chatbot_stopConversation: e.target.value,
                  }))
                }
                onBlur={() => void saveSettings(formSettings)}
              />
              <small>Quando o paciente digitar isso, o robô silencia.</small>
            </div>

            <div className={styles.field}>
              <label htmlFor="wa-stop-min">Pausa automática (minutos)</label>
              <input
                id="wa-stop-min"
                type="number"
                min={1}
                className={styles.input}
                value={formSettings.chatbot_stopMinutes}
                onChange={(e) =>
                  setFormSettings((prev) => ({
                    ...prev,
                    chatbot_stopMinutes: Number(e.target.value),
                  }))
                }
                onBlur={() => void saveSettings(formSettings)}
              />
              <small>Se você responder manualmente, o robô pausa por esse tempo.</small>
            </div>
          </aside>
        ) : !loading ? (
          <aside className={`admin-shell-card ${styles.side} ${styles.sideTips}`}>
            <h3>Como funciona</h3>
            <ul className={styles.tips}>
              <li>
                <strong>Notificações no celular</strong>
                <span>
                  Seu aparelho continua recebendo alertas normalmente após conectar.
                </span>
              </li>
              <li>
                <strong>Seguro</strong>
                <span>Conexão oficial via QR Code, igual ao WhatsApp Web.</span>
              </li>
              <li>
                <strong>Rápido</strong>
                <span>
                  O código expira em cerca de 30 segundos — atualizamos automaticamente se
                  não for escaneado.
                </span>
              </li>
              <li>
                <strong>Seu número</strong>
                <span>
                  As mensagens saem do seu WhatsApp, não de um número genérico.
                </span>
              </li>
            </ul>
          </aside>
        ) : null}
      </div>
    </div>
  )
}
