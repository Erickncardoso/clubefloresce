'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import styles from './JitsiMeetEmbed.module.scss'

type Props = {
  roomUrl: string
  roomName?: string
  jitsiDomain?: string
  displayName?: string
  role?: 'host' | 'guest'
  onReady?: () => void
  onError?: (message: string) => void
  onLeft?: () => void
}

export type JitsiMeetEmbedHandle = {
  remount: () => Promise<void>
  leaveLocally: () => Promise<void>
}

type JitsiApi = {
  addListener: (event: string, fn: (...args: unknown[]) => void) => void
  removeListener?: (event: string, fn?: (...args: unknown[]) => void) => void
  dispose: () => void
  executeCommand: (command: string, ...args: unknown[]) => void
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: Record<string, unknown>,
    ) => JitsiApi
  }
}

function resolveDomain(jitsiDomain: string | undefined, roomUrl: string) {
  const fromProp = String(jitsiDomain || '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
  if (fromProp) return fromProp
  try {
    return new URL(roomUrl).hostname
  } catch {
    return 'meet.nutrisabellajardim.com.br'
  }
}

function resolveRoomName(roomName: string | undefined, roomUrl: string) {
  const fromProp = String(roomName || '').trim()
  if (fromProp) return fromProp
  try {
    const path = new URL(roomUrl).pathname.replace(/^\/+/, '')
    return decodeURIComponent(path.split('/')[0] || '')
  } catch {
    return ''
  }
}

function buildHash(displayName: string) {
  return [
    `userInfo.displayName="${encodeURIComponent(displayName)}"`,
    'config.prejoinConfig.enabled=false',
    'config.prejoinPageEnabled=false',
    'config.disableDeepLinking=true',
    'config.deeplinking.disabled=true',
    'config.startWithAudioMuted=false',
    'config.startWithVideoMuted=false',
    'config.disableInviteFunctions=true',
    'interfaceConfig.SHOW_JITSI_WATERMARK=false',
    'interfaceConfig.SHOW_BRAND_WATERMARK=false',
    'interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false',
    'interfaceConfig.SHOW_POWERED_BY=false',
    'interfaceConfig.MOBILE_APP_PROMO=false',
    'interfaceConfig.HIDE_DEEP_LINKING_LOGO=true',
    'interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS=true',
  ].join('&')
}

function loadExternalApi(domain: string): Promise<NonNullable<typeof window.JitsiMeetExternalAPI>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Jitsi só funciona no navegador.'))
  }
  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve(window.JitsiMeetExternalAPI)
  }

  const src = `https://${domain}/external_api.js`
  const existing = document.querySelector(`script[data-jitsi-api="${domain}"]`)
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.JitsiMeetExternalAPI) return resolve(window.JitsiMeetExternalAPI)
      existing.addEventListener('load', () => {
        if (window.JitsiMeetExternalAPI) resolve(window.JitsiMeetExternalAPI)
        else reject(new Error('API do Jitsi indisponível.'))
      })
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar o Jitsi.')))
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.jitsiApi = domain
    script.onload = () => {
      if (window.JitsiMeetExternalAPI) resolve(window.JitsiMeetExternalAPI)
      else reject(new Error('API do Jitsi indisponível.'))
    }
    script.onerror = () => reject(new Error('Não foi possível carregar o Jitsi.'))
    document.head.appendChild(script)
  })
}

export const JitsiMeetEmbed = forwardRef<JitsiMeetEmbedHandle, Props>(function JitsiMeetEmbed(
  {
    roomUrl,
    roomName = '',
    jitsiDomain = 'meet.nutrisabellajardim.com.br',
    displayName = 'Participante',
    role = 'guest',
    onReady,
    onError,
    onLeft,
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const apiRef = useRef<JitsiApi | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const disposedRef = useRef(false)
  const leavingLocallyRef = useRef(false)
  const callbacksRef = useRef({ onReady, onError, onLeft })
  callbacksRef.current = { onReady, onError, onLeft }

  const clearRoot = useCallback(() => {
    if (rootRef.current) rootRef.current.innerHTML = ''
    iframeRef.current = null
  }, [])

  const disposeApi = useCallback(() => {
    if (apiRef.current) {
      try {
        apiRef.current.dispose()
      } catch {
        /* ignore */
      }
      apiRef.current = null
    }
    if (iframeRef.current) {
      try {
        iframeRef.current.src = 'about:blank'
      } catch {
        /* ignore */
      }
      iframeRef.current = null
    }
    clearRoot()
  }, [clearRoot])

  const mountIframeFallback = useCallback(
    (domain: string, resolvedRoom: string, name: string) => {
      if (!rootRef.current) return
      clearRoot()
      const iframe = document.createElement('iframe')
      iframe.className = styles.iframe
      iframe.allow =
        'camera *; microphone *; display-capture *; autoplay *; fullscreen *; clipboard-write *'
      iframe.allowFullscreen = true
      iframe.title = 'Consulta por vídeo'
      iframe.referrerPolicy = 'origin'
      iframe.src = `https://${domain}/${encodeURIComponent(resolvedRoom)}#${buildHash(name)}`
      iframe.addEventListener('load', () => callbacksRef.current.onReady?.())
      rootRef.current.appendChild(iframe)
      iframeRef.current = iframe
    },
    [clearRoot],
  )

  const mountMeeting = useCallback(async () => {
    disposedRef.current = false
    leavingLocallyRef.current = false
    disposeApi()
    if (!rootRef.current) return

    const domain = resolveDomain(jitsiDomain, roomUrl)
    const resolvedRoom = resolveRoomName(roomName, roomUrl)
    if (!domain || !resolvedRoom) {
      callbacksRef.current.onError?.('Sala de vídeo inválida.')
      return
    }

    const name =
      String(displayName || '').trim() || (role === 'host' ? 'Nutricionista' : 'Paciente')

    const isMobile =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')

    if (isMobile) {
      mountIframeFallback(domain, resolvedRoom, name)
      return
    }

    try {
      const ExternalApi = await loadExternalApi(domain)
      if (disposedRef.current || !rootRef.current) return

      const api = new ExternalApi(domain, {
        roomName: resolvedRoom,
        parentNode: rootRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName: name },
        configOverwrite: {
          prejoinConfig: { enabled: false },
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          deeplinking: { disabled: true },
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableInviteFunctions: true,
          enableWelcomePage: false,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_POWERED_BY: false,
          MOBILE_APP_PROMO: false,
          HIDE_DEEP_LINKING_LOGO: true,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          TOOLBAR_ALWAYS_VISIBLE: true,
          DEFAULT_LOGO_URL: '',
          DEFAULT_WELCOME_PAGE_LOGO_URL: '',
          PROVIDER_NAME: 'Clube Florescer',
          APP_NAME: 'Clube Florescer',
          NATIVE_APP_NAME: 'Clube Florescer',
        },
      })

      apiRef.current = api
      api.addListener('videoConferenceJoined', () => callbacksRef.current.onReady?.())
      api.addListener('readyToClose', () => {
        if (!leavingLocallyRef.current) callbacksRef.current.onLeft?.()
      })
      api.addListener('videoConferenceLeft', () => {
        if (!leavingLocallyRef.current) callbacksRef.current.onLeft?.()
      })
    } catch {
      if (disposedRef.current || !rootRef.current) return
      mountIframeFallback(domain, resolvedRoom, name)
    }
  }, [
    disposeApi,
    displayName,
    jitsiDomain,
    mountIframeFallback,
    role,
    roomName,
    roomUrl,
  ])

  const leaveLocally = useCallback(async () => {
    leavingLocallyRef.current = true
    if (apiRef.current) {
      try {
        apiRef.current.executeCommand('hangup')
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, 700))
      try {
        apiRef.current.dispose()
      } catch {
        /* ignore */
      }
      apiRef.current = null
    }
    if (iframeRef.current) {
      try {
        iframeRef.current.src = 'about:blank'
      } catch {
        /* ignore */
      }
      iframeRef.current = null
    }
    clearRoot()
    callbacksRef.current.onLeft?.()
  }, [clearRoot])

  useImperativeHandle(
    ref,
    () => ({
      remount: mountMeeting,
      leaveLocally,
    }),
    [leaveLocally, mountMeeting],
  )

  useEffect(() => {
    void mountMeeting()
    return () => {
      disposedRef.current = true
      leavingLocallyRef.current = true
      disposeApi()
    }
  }, [disposeApi, mountMeeting])

  return <div ref={rootRef} className={styles.embed} />
})
