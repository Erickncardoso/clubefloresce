'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { getCachedUser } from '@/lib/auth'
import {
  CfVideoCallHost,
  type CfVideoCallHostHandle,
} from '@/components/patients/CfVideoCallHost'
import styles from './PatientVideoCallModal.module.scss'

type VideoCallPayload = {
  call?: {
    id?: string
    roomUrl?: string
    roomName?: string
    jitsiDomain?: string
    openAppUrl?: string
    joinUrl?: string
  }
}

type Props = {
  open: boolean
  patientId: string
  patientName?: string
  onClose: () => void
}

export function PatientVideoCallModal({
  open,
  patientId,
  patientName = 'Paciente',
  onClose,
}: Props) {
  const embedRef = useRef<CfVideoCallHostHandle | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [joinUrl, setJoinUrl] = useState('')
  const [callId, setCallId] = useState('')
  const [roomUrl, setRoomUrl] = useState('')
  const [roomName, setRoomName] = useState('')
  const [jitsiDomain, setJitsiDomain] = useState('meet.nutrisabellajardim.com.br')
  const [copied, setCopied] = useState(false)
  const [notifyHint, setNotifyHint] = useState('')
  const [statusHint, setStatusHint] = useState('')
  const endingRef = useRef(false)

  const nutriDisplayName = getCachedUser()?.name?.trim() || 'Nutricionista'

  const resetState = useCallback(() => {
    setJoinUrl('')
    setCallId('')
    setRoomUrl('')
    setRoomName('')
    setJitsiDomain('meet.nutrisabellajardim.com.br')
    setError('')
    setNotifyHint('')
    setStatusHint('')
    endingRef.current = false
  }, [])

  const startCall = useCallback(async () => {
    setLoading(true)
    resetState()
    setStatusHint('conectando')
    setCopied(false)
    try {
      const data = await apiFetch<VideoCallPayload>(
        `/patients/${encodeURIComponent(patientId)}/video-call`,
        {
          method: 'POST',
          body: JSON.stringify({ notifyWhatsapp: false }),
        },
      )
      const call = data?.call
      if (!call?.roomUrl || !call?.id) {
        throw new Error('Resposta inválida ao criar a chamada.')
      }
      setCallId(call.id)
      setRoomUrl(call.roomUrl)
      setRoomName(call.roomName || '')
      setJitsiDomain(call.jitsiDomain || 'meet.nutrisabellajardim.com.br')
      setJoinUrl(call.openAppUrl || call.joinUrl || '')
      setStatusHint('ao vivo')
      setNotifyHint('Notificação enviada. Aguardando o paciente atender no app.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível iniciar a chamada.')
      setStatusHint('')
    } finally {
      setLoading(false)
    }
  }, [patientId, resetState])

  const endCall = useCallback(async () => {
    if (endingRef.current) return
    endingRef.current = true
    const id = callId
    setCallId('')
    try {
      await embedRef.current?.leaveLocally()
    } catch {
      /* ignore */
    }
    setRoomUrl('')
    setRoomName('')
    if (id && patientId) {
      try {
        await apiFetch(`/patients/${encodeURIComponent(patientId)}/video-call/${encodeURIComponent(id)}/end`, {
          method: 'POST',
        })
      } catch {
        /* fecha mesmo se o fim falhar */
      }
    }
    endingRef.current = false
    onClose()
  }, [callId, onClose, patientId])

  useEffect(() => {
    if (open) void startCall()
    else if (callId) void endCall()
    else resetState()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage a open
  }, [open])

  async function copyLink() {
    if (!joinUrl || typeof navigator === 'undefined') return
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  if (!open) return null

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="pvc-title">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.copy}>
            <h2 id="pvc-title">Consulta por vídeo</h2>
            <p>
              {patientName}
              {statusHint ? ` · ${statusHint}` : ''}
            </p>
          </div>
          <div className={styles.actions}>
            {joinUrl ? (
              <button type="button" className={`btn-secondary ${styles.btn}`} onClick={() => void copyLink()}>
                {copied ? 'Link copiado' : 'Copiar link'}
              </button>
            ) : null}
            <button type="button" className={`btn-primary ${styles.btn} ${styles.btnEnd}`} onClick={() => void endCall()}>
              Encerrar
            </button>
          </div>
        </header>

        <div className={styles.body}>
          {loading ? <div className={styles.state}>Iniciando chamada…</div> : null}
          {!loading && error ? (
            <div className={`${styles.state} ${styles.stateError}`}>
              <p>{error}</p>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Fechar
              </button>
            </div>
          ) : null}
          {!loading && !error && roomUrl ? (
            <CfVideoCallHost
              ref={embedRef}
              roomUrl={roomUrl}
              roomName={roomName}
              jitsiDomain={jitsiDomain}
              displayName={nutriDisplayName}
              patientName={patientName}
              onReady={() => {
                setStatusHint('ao vivo')
                setNotifyHint('Chamada aberta. Peça para o paciente tocar em Atender no app.')
              }}
              onError={(message) => {
                setStatusHint('com aviso')
                setNotifyHint(
                  `${message} A chamada continua aberta para o paciente.`,
                )
              }}
              onLeft={() => {
                if (endingRef.current) return
                setStatusHint('ao vivo')
                setNotifyHint('A chamada continua aberta. O paciente ainda pode atender no app.')
              }}
            />
          ) : null}
        </div>

        {notifyHint ? <p className={styles.footer}>{notifyHint}</p> : null}
      </div>
    </div>
  )
}
