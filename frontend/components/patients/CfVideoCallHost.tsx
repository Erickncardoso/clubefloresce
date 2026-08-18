'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Image, Mic, MicOff, PhoneOff, SwitchCamera, Video, VideoOff, Volume2, VolumeX } from 'lucide-react'
import { CF_BACKGROUND_PRESETS } from '@/lib/jitsi-background-blur'
import {
  startJitsiLibCall,
  type JitsiCallHandle,
  type JitsiCallState,
} from '@/lib/jitsi-lib-call'
import styles from './CfVideoCallHost.module.scss'

type Props = {
  roomUrl: string
  roomName?: string
  jitsiDomain?: string
  displayName?: string
  patientName?: string
  onReady?: () => void
  onError?: (message: string) => void
  onLeft?: () => void
}

export type CfVideoCallHostHandle = {
  remount: () => Promise<void>
  leaveLocally: () => Promise<void>
}

function initials(name: string) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  const text = `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase()
  return text || '?'
}

const EMPTY: JitsiCallState = {
  status: 'connecting',
  remoteName: '',
  remoteHasVideo: false,
  localHasVideo: false,
  audioMuted: false,
  videoMuted: false,
  speakerMuted: false,
  backgroundMode: 'none',
}

export const CfVideoCallHost = forwardRef<CfVideoCallHostHandle, Props>(function CfVideoCallHost(
  {
    roomUrl,
    roomName = '',
    jitsiDomain = 'meet.nutrisabellajardim.com.br',
    displayName = 'Nutricionista',
    patientName = 'Paciente',
    onReady,
    onError,
    onLeft,
  },
  ref,
) {
  const callRef = useRef<JitsiCallHandle | null>(null)
  const remoteRef = useRef<HTMLVideoElement | null>(null)
  const localRef = useRef<HTMLVideoElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const leftOnce = useRef(false)
  const callbacksRef = useRef({ onReady, onError, onLeft })
  callbacksRef.current = { onReady, onError, onLeft }
  const [media, setMedia] = useState<JitsiCallState>(EMPTY)
  const [bgOpen, setBgOpen] = useState(false)
  const [bgBusy, setBgBusy] = useState(false)
  const [remotePortrait, setRemotePortrait] = useState(false)

  const resolvedRoom = roomName || (() => {
    try {
      return decodeURIComponent(new URL(roomUrl).pathname.replace(/^\/+/, '').split('/')[0] || '')
    } catch {
      return ''
    }
  })()

  const bind = useCallback(() => {
    callRef.current?.bind({
      remote: remoteRef.current,
      local: localRef.current,
      audio: audioRef.current,
    })
  }, [])

  const start = useCallback(async () => {
    leftOnce.current = false
    setMedia(EMPTY)
    await callRef.current?.leave().catch(() => {})
    callRef.current = null
    const handle = await startJitsiLibCall({
      domain: jitsiDomain,
      roomName: resolvedRoom,
      displayName,
      onState: (next) => {
        setMedia(next)
        if (next.status === 'live' || next.status === 'waiting') callbacksRef.current.onReady?.()
      },
      onError: (message) => callbacksRef.current.onError?.(message),
      onLeft: () => {
        if (leftOnce.current) return
        leftOnce.current = true
        callbacksRef.current.onLeft?.()
      },
    })
    callRef.current = handle
    bind()
    return handle
  }, [bind, displayName, jitsiDomain, resolvedRoom])

  useEffect(() => {
    let cancelled = false
    let session: JitsiCallHandle | null = null
    leftOnce.current = false
    setMedia(EMPTY)

    void (async () => {
      try {
        session = await startJitsiLibCall({
          domain: jitsiDomain,
          roomName: resolvedRoom,
          displayName,
          onState: (next) => {
            if (cancelled) return
            setMedia(next)
            if (next.status === 'live' || next.status === 'waiting') callbacksRef.current.onReady?.()
          },
          onError: (message) => {
            if (!cancelled) callbacksRef.current.onError?.(message)
          },
          onLeft: () => {
            if (cancelled || leftOnce.current) return
            leftOnce.current = true
            callbacksRef.current.onLeft?.()
          },
        })
        if (cancelled) {
          await session.leave()
          return
        }
        callRef.current = session
        bind()
      } catch (err) {
        if (!cancelled) {
          callbacksRef.current.onError?.(err instanceof Error ? err.message : 'Falha na chamada.')
        }
      }
    })()

    return () => {
      cancelled = true
      leftOnce.current = true
      const hanging = session
      callRef.current = null
      void hanging?.leave()
    }
  }, [bind, displayName, jitsiDomain, resolvedRoom])

  useEffect(() => {
    bind()
  }, [bind, media.localHasVideo, media.remoteHasVideo])

  useEffect(() => {
    const video = remoteRef.current
    if (!video || !media.remoteHasVideo) {
      setRemotePortrait(false)
      return undefined
    }
    const sync = () => {
      const w = video.videoWidth || 0
      const h = video.videoHeight || 0
      setRemotePortrait(w > 0 && h > w)
    }
    sync()
    video.addEventListener('loadedmetadata', sync)
    video.addEventListener('resize', sync)
    return () => {
      video.removeEventListener('loadedmetadata', sync)
      video.removeEventListener('resize', sync)
    }
  }, [media.remoteHasVideo])

  useImperativeHandle(
    ref,
    () => ({
      remount: start,
      leaveLocally: async () => {
        leftOnce.current = true
        await callRef.current?.leave()
        callRef.current = null
      },
    }),
    [start],
  )

  const applyBackground = async (mode: string) => {
    if (bgBusy) return
    setBgBusy(true)
    try {
      await callRef.current?.setBackground(mode)
    } catch (err) {
      callbacksRef.current.onError?.(err instanceof Error ? err.message : 'Não foi possível aplicar o fundo.')
    } finally {
      setBgBusy(false)
    }
  }

  const waiting = media.status === 'connecting' || media.status === 'waiting'
  const remoteLabel = media.remoteName || patientName
  const remoteFirst = remoteLabel.split(' ')[0] || remoteLabel

  return (
    <div className={styles.root}>
      <audio ref={audioRef} autoPlay playsInline />

      <div className={`${styles.remote} ${media.remoteHasVideo ? styles.tileLive : ''}`}>
        <video
          ref={remoteRef}
          className={`${styles.video} ${remotePortrait ? styles.videoContain : ''} ${media.remoteHasVideo ? '' : styles.hidden}`}
          autoPlay
          playsInline
        />
        {waiting ? (
          <div className={styles.waiting}>
            {media.status === 'connecting' ? 'Conectando à consulta…' : 'Aguardando o paciente…'}
          </div>
        ) : null}
        {!waiting && !media.remoteHasVideo ? (
          <div className={styles.avatarWrap}>
            <span className={styles.avatar}>{initials(remoteLabel)}</span>
          </div>
        ) : null}
        {!waiting ? <span className={styles.name}>{remoteFirst}</span> : null}
      </div>

      <div className={`${styles.self} ${media.localHasVideo ? styles.tileLive : ''}`}>
        <video
          ref={localRef}
          className={`${styles.video} ${media.localHasVideo ? '' : styles.hidden}`}
          autoPlay
          playsInline
          muted
        />
        {!media.localHasVideo ? (
          <div className={styles.avatarWrap}>
            <span className={`${styles.avatar} ${styles.avatarSm}`}>{initials(displayName)}</span>
          </div>
        ) : null}
        <button
          type="button"
          className={styles.flip}
          aria-label="Inverter câmera"
          onClick={() => void callRef.current?.flipCamera()}
        >
          <SwitchCamera size={15} />
        </button>
        <button
          type="button"
          className={`${styles.flip} ${styles.bgBtn} ${media.backgroundMode !== 'none' ? styles.bgBtnOn : ''}`}
          aria-label="Fundos virtuais"
          onClick={() => setBgOpen((open) => !open)}
        >
          <Image size={14} />
        </button>
      </div>

      <div className={styles.toolbar}>
        <button
          type="button"
          className={`${styles.btn} ${media.speakerMuted ? styles.btnOff : ''}`}
          aria-label={media.speakerMuted ? 'Ativar áudio' : 'Silenciar áudio'}
          onClick={() => callRef.current?.toggleSpeaker()}
        >
          {media.speakerMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${media.audioMuted ? styles.btnOff : ''}`}
          aria-label={media.audioMuted ? 'Ativar microfone' : 'Silenciar microfone'}
          onClick={() => void callRef.current?.toggleAudio()}
        >
          {media.audioMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${media.videoMuted ? styles.btnOff : ''}`}
          aria-label={media.videoMuted ? 'Ligar câmera' : 'Desligar câmera'}
          onClick={() => void callRef.current?.toggleVideo()}
        >
          {media.videoMuted ? <VideoOff size={20} /> : <Video size={20} />}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${media.backgroundMode !== 'none' ? styles.btnOn : ''}`}
          aria-label="Fundos virtuais"
          onClick={() => setBgOpen((open) => !open)}
        >
          <Image size={20} />
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.hang}`}
          aria-label="Encerrar"
          onClick={() => callbacksRef.current.onLeft?.()}
        >
          <PhoneOff size={20} />
        </button>
      </div>

      {bgOpen ? (
        <div className={styles.bgPanel} role="dialog" aria-label="Fundos virtuais">
          <p className={styles.bgTitle}>Fundos virtuais</p>
          <div className={styles.bgChips}>
            {[
              { id: 'none', label: 'Nenhum' },
              { id: 'soft', label: 'Suave' },
              { id: 'blur', label: 'Forte' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.bgChip} ${media.backgroundMode === item.id ? styles.bgChipOn : ''}`}
                disabled={bgBusy}
                onClick={() => void applyBackground(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className={styles.bgGrid}>
            {CF_BACKGROUND_PRESETS.map((bg) => (
              <button
                key={bg.id}
                type="button"
                className={`${styles.bgPreset} ${media.backgroundMode === `image:${bg.id}` ? styles.bgChipOn : ''}`}
                style={{ background: `linear-gradient(135deg, ${bg.colors?.[0] || '#1a2433'}, ${bg.colors?.[1] || '#3d5668'})` }}
                disabled={bgBusy}
                onClick={() => void applyBackground(`image:${bg.id}`)}
              >
                {bg.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
})
