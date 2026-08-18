import {
  CF_BACKGROUND_PRESETS,
  createBackgroundBlurEffect,
  preloadVirtualBackgroundEngine,
  resolveBackgroundPresetUrl,
} from '@/lib/jitsi-background-blur'
import { installJitsiConsoleFilter } from '@/lib/jitsi-console-filter'

export type JitsiCallStatus = 'connecting' | 'waiting' | 'live' | 'error' | 'left'

export type JitsiCallState = {
  status: JitsiCallStatus
  remoteName: string
  remoteHasVideo: boolean
  localHasVideo: boolean
  audioMuted: boolean
  videoMuted: boolean
  speakerMuted: boolean
  backgroundMode: string
}

export type JitsiCallHandle = {
  toggleAudio: () => Promise<void>
  toggleVideo: () => Promise<void>
  flipCamera: () => Promise<void>
  toggleSpeaker: () => void
  setBackground: (mode: string) => Promise<void>
  leave: () => Promise<void>
  bind: (els: { remote?: HTMLVideoElement | null; local?: HTMLVideoElement | null; audio?: HTMLAudioElement | null }) => void
}

type MeetJS = {
  init: (opts: Record<string, unknown>) => void
  setLogLevel?: (level: unknown) => void
  setLogLevelById?: (id: string, level: unknown) => void
  logLevels?: { ERROR?: unknown }
  createLocalTracks: (opts: Record<string, unknown>) => Promise<JitsiTrack[]>
  JitsiConnection: new (a: null, b: null, opts: Record<string, unknown>) => JitsiConnection
  events: {
    connection: { CONNECTION_ESTABLISHED: string; CONNECTION_FAILED: string }
    conference: {
      TRACK_ADDED: string
      TRACK_REMOVED: string
      TRACK_MUTE_CHANGED: string
      USER_JOINED: string
      USER_LEFT: string
      CONFERENCE_JOINED: string
      CONFERENCE_FAILED: string
      CONFERENCE_LEFT: string
    }
  }
}

type JitsiTrack = {
  getType: () => string
  isLocal?: () => boolean
  isMuted?: () => boolean
  mute?: () => Promise<void>
  unmute?: () => Promise<void>
  attach: (el: HTMLElement) => void
  detach?: (el?: HTMLElement) => void
  dispose?: () => void
  getParticipantId?: () => string
  getTrack?: () => MediaStreamTrack
  stream?: MediaStream
  setEffect?: (effect?: unknown) => Promise<void>
}

type JitsiConnection = {
  addEventListener: (ev: string, fn: (...args: unknown[]) => void) => void
  removeEventListener: (ev: string, fn: (...args: unknown[]) => void) => void
  connect: () => void
  disconnect: () => void
  initJitsiConference: (room: string, opts: Record<string, unknown>) => JitsiConference
  xmpp?: JitsiXmpp
  _xmpp?: JitsiXmpp
}

type JitsiXmpp = {
  connection?: {
    jingle?: {
      getStunAndTurnCredentials?: () => void
    }
  }
}

type JitsiConference = {
  on: (ev: string, fn: (...args: unknown[]) => void) => void
  addEventListener: (ev: string, fn: (...args: unknown[]) => void) => void
  removeEventListener: (ev: string, fn: (...args: unknown[]) => void) => void
  addTrack: (track: JitsiTrack) => Promise<void> | void
  removeTrack?: (track: JitsiTrack) => Promise<void>
  replaceTrack?: (oldTrack: JitsiTrack, next: JitsiTrack) => Promise<void>
  setDisplayName: (name: string) => void
  join: () => void
  leave: () => Promise<void>
  getLocalTracks?: () => JitsiTrack[]
  getParticipants?: () => Array<{ getId?: () => string; _id?: string; getTracks?: () => JitsiTrack[]; getDisplayName?: () => string }>
  myUserId?: () => string
  setAudioMute?: (muted: boolean) => Promise<void>
  setVideoMute?: (muted: boolean) => Promise<void>
  isAudioMuted?: () => boolean
  isVideoMuted?: () => boolean
  setSenderVideoConstraint?: (maxFrameHeight: number) => void
  setReceiverVideoConstraint?: (maxFrameHeight: number) => void
  setReceiverConstraints?: (constraints: Record<string, unknown>) => void
}

declare global {
  interface Window {
    JitsiMeetJS?: MeetJS
  }
}

const XMPP = 'meet.jitsi'
const MUC = 'conference.meet.jitsi'
const DEFAULT_DOMAIN = 'meet.nutrisabellajardim.com.br'
const P2P_STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

function cleanDomain(value: string) {
  return String(value || DEFAULT_DOMAIN).replace(/^https?:\/\//, '').replace(/\/+$/, '') || DEFAULT_DOMAIN
}

function isMobileBrowser() {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

function pickVideoConstraints(facing: string = 'user') {
  if (isMobileBrowser()) {
    return {
      facingMode: facing,
      width: { ideal: 1080, max: 1080, min: 720 },
      height: { ideal: 1920, max: 1920, min: 1280 },
      aspectRatio: { ideal: 0.5625 },
      frameRate: { ideal: 24, max: 30 },
    }
  }
  return {
    facingMode: facing,
    width: { ideal: 1920, max: 1920, min: 1280 },
    height: { ideal: 1080, max: 1080, min: 720 },
    frameRate: { ideal: 24, max: 30 },
  }
}

function applyHighQuality(conference: JitsiConference | null) {
  if (!conference) return
  try {
    conference.setSenderVideoConstraint?.(1080)
    conference.setReceiverVideoConstraint?.(1080)

    const constraints: Record<string, unknown> = {
      lastN: -1,
      assumedBandwidthBps: 8_000_000,
      defaultConstraints: { maxHeight: 1080 },
    }

    try {
      const perSource: Record<string, { maxHeight: number }> = {}
      for (const participant of conference.getParticipants?.() || []) {
        const id = participant.getId?.() || participant._id
        if (id) perSource[id] = { maxHeight: 1080 }
      }
      if (Object.keys(perSource).length) constraints.constraints = perSource
    } catch {
      /* ignore */
    }

    conference.setReceiverConstraints?.(constraints)
  } catch {
    /* ignore */
  }
}

function scheduleHighQuality(conference: JitsiConference | null) {
  applyHighQuality(conference)
  window.setTimeout(() => applyHighQuality(conference), 800)
  window.setTimeout(() => applyHighQuality(conference), 2500)
}

function loadLib(domain: string): Promise<MeetJS> {
  if (window.JitsiMeetJS) return Promise.resolve(window.JitsiMeetJS)
  const src = `https://${domain}/libs/lib-jitsi-meet.min.js`
  const existing = document.querySelector(`script[data-ljm="${domain}"]`)
  return new Promise((resolve, reject) => {
    const done = () => {
      if (window.JitsiMeetJS) resolve(window.JitsiMeetJS)
      else reject(new Error('lib-jitsi-meet indisponível.'))
    }
    if (existing) {
      existing.addEventListener('load', done)
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar o vídeo.')))
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.ljm = domain
    script.onload = done
    script.onerror = () => reject(new Error('Não foi possível carregar o servidor de vídeo.'))
    document.head.appendChild(script)
  })
}

function skipExtdiscoLookup(connection: JitsiConnection) {
  const xmpp = connection.xmpp || connection._xmpp
  const jingle = xmpp?.connection?.jingle
  if (jingle) jingle.getStunAndTurnCredentials = () => undefined
}

function isLocalJitsiTrack(track: JitsiTrack | null | undefined) {
  if (!track) return false
  try {
    if (typeof track.isLocal === 'function') return Boolean(track.isLocal())
  } catch {
    /* ignore */
  }
  return false
}

function attach(track: JitsiTrack | null | undefined, el: HTMLElement | null | undefined) {
  if (!track || !el) return
  try {
    if (el instanceof HTMLMediaElement && el.srcObject) {
      try {
        track.detach?.(el)
      } catch {
        /* ignore */
      }
    }
    track.attach(el)
    if (el instanceof HTMLMediaElement) {
      el.autoplay = true
      el.playsInline = true
      void el.play?.().catch(() => {})
    }
  } catch {
    /* ignore */
  }
}

function clearMedia(el: HTMLMediaElement | null | undefined) {
  if (!el) return
  try {
    el.srcObject = null
  } catch {
    /* ignore */
  }
}

export async function startJitsiLibCall(input: {
  domain: string
  roomName: string
  displayName: string
  onState: (state: JitsiCallState) => void
  onLeft?: () => void
  onError?: (message: string) => void
}): Promise<JitsiCallHandle> {
  const domain = cleanDomain(input.domain)
  const room = String(input.roomName || '').trim().toLowerCase()
  const displayName = String(input.displayName || '').trim() || 'Nutricionista'
  const state: JitsiCallState = {
    status: 'connecting',
    remoteName: '',
    remoteHasVideo: false,
    localHasVideo: false,
    audioMuted: false,
    videoMuted: false,
    speakerMuted: false,
    backgroundMode: 'none',
  }

  let backgroundImageUrl = ''
  let MeetJS: MeetJS | null = null
  let connection: JitsiConnection | null = null
  let conference: JitsiConference | null = null
  let localTracks: JitsiTrack[] = []
  const remoteTracks: Record<string, { name: string; audio?: JitsiTrack; video?: JitsiTrack }> = {}
  let disposed = false
  let cameraFacing: 'user' | 'environment' = 'user'
  let els: { remote?: HTMLVideoElement | null; local?: HTMLVideoElement | null; audio?: HTMLAudioElement | null } = {}

  const emit = () => {
    if (!disposed) input.onState({ ...state })
  }

  const getLocal = (type: string) => {
    const fromConf = conference?.getLocalTracks?.() || []
    return [...fromConf, ...localTracks].find((t) => t.getType() === type) || null
  }

  const myId = () => conference?.myUserId?.() || ''

  const storeRemoteTrack = (track: JitsiTrack) => {
    if (isLocalJitsiTrack(track)) return false
    const pid = track.getParticipantId?.()
    if (!pid || pid === myId()) return false
    if (!remoteTracks[pid]) remoteTracks[pid] = { name: 'Participante' }
    if (track.getType() === 'audio') remoteTracks[pid].audio = track
    else remoteTracks[pid].video = track
    return true
  }

  const harvestParticipantTracks = (user?: { getTracks?: () => JitsiTrack[] }) => {
    try {
      for (const track of user?.getTracks?.() || []) storeRemoteTrack(track)
    } catch {
      /* ignore */
    }
  }

  const harvestExistingParticipants = () => {
    try {
      for (const participant of conference?.getParticipants?.() || []) {
        harvestParticipantTracks(participant)
      }
    } catch {
      /* ignore */
    }
  }

  const syncRemote = () => {
    const mine = myId()
    const first = Object.entries(remoteTracks).find(([id]) => id && id !== mine)?.[1]
    if (!first?.video && !first?.audio) {
      state.remoteName = ''
      state.remoteHasVideo = false
      if (state.status === 'live') state.status = 'waiting'
      clearMedia(els.remote)
      emit()
      return
    }
    const video = first.video
    state.remoteName = first.name || 'Participante'
    state.remoteHasVideo = !!(video && !video.isMuted?.() && !isLocalJitsiTrack(video))
    state.status = 'live'
    if (state.remoteHasVideo) {
      attach(video, els.remote)
      scheduleHighQuality(conference)
    } else clearMedia(els.remote)
    if (first.audio) attach(first.audio, els.audio)
    emit()
  }

  const syncLocal = () => {
    const video = getLocal('video')
    const audio = getLocal('audio')
    state.audioMuted = !!(audio?.isMuted?.() || conference?.isAudioMuted?.())
    state.videoMuted = !!(video?.isMuted?.() || conference?.isVideoMuted?.() || !video)
    state.localHasVideo = !!(video && !video.isMuted?.())
    if (state.localHasVideo) attach(video, els.local)
    emit()
  }

  const Meet = await loadLib(domain)
  MeetJS = Meet
  const restoreConsole = installJitsiConsoleFilter()
  Meet.setLogLevel?.(Meet.logLevels?.ERROR || 'error')
  Meet.setLogLevelById?.('xmpp:JingleSessionPC', 99)
  Meet.setLogLevelById?.('xmpp:StropheErrorHandler', 99)
  Meet.setLogLevelById?.('xmpp:strophe.jingle', 99)
  Meet.init({ disableAudioLevels: true, disableThirdPartyRequests: true })

  const attempts = [
    { devices: ['audio', 'video'], resolution: 1080, constraints: { video: pickVideoConstraints('user') } },
    { devices: ['audio', 'video'], resolution: 720, constraints: { video: pickVideoConstraints('user') } },
    { devices: ['audio', 'video'], resolution: 720 },
    { devices: ['audio', 'video'] },
    { devices: ['video'] },
    { devices: ['audio'] },
  ]
  for (const attempt of attempts) {
    try {
      localTracks = (await Meet.createLocalTracks(attempt)) || []
      break
    } catch {
      localTracks = []
    }
  }
  for (const track of localTracks) {
    try {
      if (track.isMuted?.()) await track.unmute?.()
    } catch {
      /* ignore */
    }
  }
  syncLocal()

  connection = new Meet.JitsiConnection(null, null, {
    hosts: { domain: XMPP, muc: MUC },
    serviceUrl: `wss://${domain}/xmpp-websocket`,
    bosh: `https://${domain}/http-bind`,
    clientNode: 'https://jitsi.org/jitsimeet',
    p2p: { stunServers: P2P_STUN_SERVERS },
    p2pStunServers: P2P_STUN_SERVERS,
  })
  skipExtdiscoLookup(connection)

  await new Promise<void>((resolve, reject) => {
    const onOk = () => {
      cleanup()
      resolve()
    }
    const onFail = () => {
      cleanup()
      reject(new Error('Falha na conexão com o servidor de vídeo.'))
    }
    const cleanup = () => {
      connection?.removeEventListener(Meet.events.connection.CONNECTION_ESTABLISHED, onOk)
      connection?.removeEventListener(Meet.events.connection.CONNECTION_FAILED, onFail)
    }
    connection!.addEventListener(Meet.events.connection.CONNECTION_ESTABLISHED, onOk)
    connection!.addEventListener(Meet.events.connection.CONNECTION_FAILED, onFail)
    connection!.connect()
  }).catch((err) => {
    restoreConsole()
    throw err
  })

  if (disposed) {
    restoreConsole()
    throw new Error('Chamada encerrada.')
  }

  conference = connection.initJitsiConference(room, {
    openBridgeChannel: 'websocket',
    p2p: { enabled: false },
    channelLastN: -1,
    startLastN: -1,
    videoQuality: {
      maxBitratesVideo: {
        low: 400_000,
        standard: 1_500_000,
        high: 4_000_000,
        fullHd: 6_000_000,
        ultraHd: 8_000_000,
        ssHigh: 2_500_000,
      },
    },
  })

  conference.on(Meet.events.conference.TRACK_ADDED, (track: JitsiTrack) => {
    if (isLocalJitsiTrack(track)) return
    if (storeRemoteTrack(track)) {
      syncRemote()
      scheduleHighQuality(conference)
      return
    }
    window.setTimeout(() => {
      if (storeRemoteTrack(track)) {
        syncRemote()
        scheduleHighQuality(conference)
      }
    }, 400)
  })
  conference.on(Meet.events.conference.TRACK_REMOVED, (track: JitsiTrack) => {
    if (isLocalJitsiTrack(track)) return
    const pid = track.getParticipantId?.()
    if (!pid || !remoteTracks[pid]) return
    if (track.getType() === 'audio') delete remoteTracks[pid].audio
    else delete remoteTracks[pid].video
    try {
      track.detach?.()
    } catch {
      /* ignore */
    }
    syncRemote()
  })
  conference.on(Meet.events.conference.TRACK_MUTE_CHANGED, (track: JitsiTrack) => {
    if (isLocalJitsiTrack(track) || track.getParticipantId?.() === myId()) syncLocal()
    else syncRemote()
  })
  conference.on(Meet.events.conference.USER_JOINED, (id: string, user?: { getDisplayName?: () => string; getTracks?: () => JitsiTrack[] }) => {
    if (!id || id === myId()) return
    if (!remoteTracks[id]) remoteTracks[id] = { name: user?.getDisplayName?.() || 'Participante' }
    else if (user?.getDisplayName) remoteTracks[id].name = user.getDisplayName() || remoteTracks[id].name
    harvestParticipantTracks(user)
    syncRemote()
    scheduleHighQuality(conference)
  })
  conference.on(Meet.events.conference.USER_LEFT, (id: string) => {
    if (!id || id === myId()) return
    delete remoteTracks[id]
    syncRemote()
  })
  conference.on(Meet.events.conference.CONFERENCE_LEFT, () => {
    if (disposed) return
    state.status = 'left'
    emit()
    input.onLeft?.()
  })
  conference.setDisplayName(displayName)

  await new Promise<void>((resolve, reject) => {
    const onJoined = () => {
      cleanup()
      resolve()
    }
    const onFailed = () => {
      cleanup()
      reject(new Error('Falha ao entrar na sala.'))
    }
    const cleanup = () => {
      conference?.removeEventListener(Meet.events.conference.CONFERENCE_JOINED, onJoined)
      conference?.removeEventListener(Meet.events.conference.CONFERENCE_FAILED, onFailed)
    }
    conference!.addEventListener(Meet.events.conference.CONFERENCE_JOINED, onJoined)
    conference!.addEventListener(Meet.events.conference.CONFERENCE_FAILED, onFailed)
    conference!.join()
  }).catch((err) => {
    restoreConsole()
    throw err
  })

  for (const track of localTracks) {
    try {
      await conference.addTrack(track)
    } catch {
      /* ignore */
    }
  }
  harvestExistingParticipants()
  scheduleHighQuality(conference)
  state.status = Object.keys(remoteTracks).length ? 'live' : 'waiting'
  syncLocal()
  syncRemote()
  void preloadVirtualBackgroundEngine()

  async function applyBackground(mode: string, imageUrl = '') {
    const nextMode = mode || 'none'
    const track = getLocal('video')
    if (!track || typeof track.setEffect !== 'function') {
      state.backgroundMode = 'none'
      backgroundImageUrl = ''
      emit()
      throw new Error(
        !track
          ? 'Ligue a câmera para aplicar o fundo.'
          : 'Efeito de fundo não disponível neste navegador.',
      )
    }

    state.backgroundMode = nextMode
    backgroundImageUrl = nextMode.startsWith('image:') ? String(imageUrl || '') : ''
    emit()

    if (nextMode !== 'none') {
      const ready = await preloadVirtualBackgroundEngine()
      if (!ready) throw new Error('Motor de fundo virtual indisponível.')
    }

    if (nextMode === 'none') {
      await track.setEffect(undefined)
      syncLocal()
      return
    }

    try {
      await track.setEffect(undefined)
    } catch {
      /* ignore */
    }

    const effect = nextMode.startsWith('image:') && backgroundImageUrl
      ? await createBackgroundBlurEffect({
          backgroundType: 'image',
          backgroundImageUrl: backgroundImageUrl,
        })
      : await createBackgroundBlurEffect({
          backgroundType: 'blur',
          blurValue: nextMode === 'soft' ? 8 : 25,
        })

    await track.setEffect(effect)
    syncLocal()
  }

  const handle: JitsiCallHandle = {
    bind(next) {
      els = next
      syncLocal()
      syncRemote()
    },
    async toggleAudio() {
      if (!conference) return
      const next = !state.audioMuted
      if (conference.setAudioMute) await conference.setAudioMute(next)
      else {
        const t = getLocal('audio')
        if (next) await t?.mute?.()
        else await t?.unmute?.()
      }
      syncLocal()
    },
    async toggleVideo() {
      if (!conference) return
      const next = !state.videoMuted
      if (conference.setVideoMute) await conference.setVideoMute(next)
      else {
        const t = getLocal('video')
        if (next) await t?.mute?.()
        else await t?.unmute?.()
      }
      syncLocal()
    },
    toggleSpeaker() {
      state.speakerMuted = !state.speakerMuted
      if (els.audio) els.audio.muted = state.speakerMuted
      emit()
    },
    async flipCamera() {
      const current = getLocal('video')
      if (!current || !MeetJS || !conference) return
      const prevBgMode = state.backgroundMode
      const prevBgUrl = backgroundImageUrl
      if (prevBgMode !== 'none' && typeof current.setEffect === 'function') {
        try {
          await current.setEffect(undefined)
        } catch {
          /* ignore */
        }
      }
      const nextFacing = cameraFacing === 'user' ? 'environment' : 'user'
      const created = await MeetJS.createLocalTracks({
        devices: ['video'],
        resolution: 1080,
        constraints: { video: pickVideoConstraints(nextFacing) },
      })
      const next = created.find((t) => t.getType() === 'video')
      if (!next) return
      if (conference.replaceTrack) await conference.replaceTrack(current, next)
      else {
        try {
          await conference.removeTrack?.(current)
        } catch {
          /* ignore */
        }
        await conference.addTrack(next)
      }
      localTracks = localTracks.filter((t) => t !== current).concat(next)
      try {
        current.dispose?.()
      } catch {
        /* ignore */
      }
      cameraFacing = nextFacing
      syncLocal()
      if (prevBgMode && prevBgMode !== 'none') {
        try {
          await applyBackground(prevBgMode, prevBgUrl)
        } catch {
          /* ignore */
        }
      }
    },
    async setBackground(mode) {
      const nextMode = mode || 'none'
      if (nextMode !== 'none' && state.videoMuted) {
        await handle.toggleVideo()
      }
      let imageUrl = ''
      if (nextMode.startsWith('image:')) {
        const presetId = nextMode.slice('image:'.length)
        const preset = CF_BACKGROUND_PRESETS.find((item) => item.id === presetId)
        imageUrl = preset ? resolveBackgroundPresetUrl(preset) : ''
      }
      try {
        await applyBackground(nextMode, imageUrl)
      } catch {
        state.backgroundMode = 'none'
        backgroundImageUrl = ''
        const track = getLocal('video')
        try {
          await track?.setEffect?.(undefined)
        } catch {
          /* ignore */
        }
        syncLocal()
        throw new Error('Não foi possível aplicar o efeito de fundo.')
      }
    },
    async leave() {
      if (disposed) return
      disposed = true
      try {
        await conference?.leave()
      } catch {
        /* ignore */
      }
      for (const t of localTracks) {
        try {
          t.dispose?.()
        } catch {
          /* ignore */
        }
      }
      try {
        connection?.disconnect()
      } catch {
        /* ignore */
      }
      restoreConsole()
      state.status = 'left'
      emit()
      input.onLeft?.()
    },
  }

  return handle
}
