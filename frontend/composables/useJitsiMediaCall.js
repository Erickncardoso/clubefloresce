/**
 * lib-jitsi-meet — mídia do Jitsi com UI própria (Clube Florescer).
 */
import { markRaw } from 'vue'
import {
  createBackgroundBlurEffect,
  CF_BACKGROUND_PRESETS,
  preloadVirtualBackgroundEngine,
} from '~/utils/jitsi-background-blur.js'

const DEFAULT_DOMAIN = 'meet.nutrisabellajardim.com.br'
const XMPP_DOMAIN = 'meet.jitsi'
const MUC_DOMAIN = 'conference.meet.jitsi'

function loadLib(domain) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Só funciona no navegador.'))
  }
  if (window.JitsiMeetJS) return Promise.resolve(window.JitsiMeetJS)

  const src = `https://${domain}/libs/lib-jitsi-meet.min.js`
  const existing = document.querySelector(`script[data-ljm="${domain}"]`)
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.JitsiMeetJS) return resolve(window.JitsiMeetJS)
      existing.addEventListener('load', () => resolve(window.JitsiMeetJS))
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar lib-jitsi-meet.')))
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.ljm = domain
    script.onload = () => {
      if (window.JitsiMeetJS) resolve(window.JitsiMeetJS)
      else reject(new Error('lib-jitsi-meet indisponível.'))
    }
    script.onerror = () => reject(new Error('Não foi possível carregar a lib de vídeo.'))
    document.head.appendChild(script)
  })
}

function ensureInit(JitsiMeetJS) {
  if (typeof window === 'undefined') return
  // Reaplica se a lib já foi iniciada sem audio levels (HMR / sessão anterior)
  if (window.__cfJitsiMeetInited && window.__cfJitsiAudioLevels === true) return
  JitsiMeetJS.setLogLevel?.(JitsiMeetJS.logLevels?.ERROR || 'error')
  JitsiMeetJS.init({
    disableAudioLevels: false,
    disableThirdPartyRequests: true,
  })
  window.__cfJitsiMeetInited = true
  window.__cfJitsiAudioLevels = true
}

function detachTrack(track) {
  if (!track || typeof track.detach !== 'function') return
  try {
    const attached = track.containers ? [...track.containers] : []
    if (attached.length) attached.forEach((el) => track.detach(el))
    else track.detach()
  } catch {
    // ignore
  }
}

function friendlyMediaError(err) {
  const raw = String(
    err?.message || err?.errorMsg || err?.name || (typeof err === 'string' ? err : '') || '',
  ).trim()
  if (!raw || raw === 'undefined' || raw === '[object Object]') {
    return 'Não foi possível acessar câmera/microfone.'
  }
  if (/not found|NotFoundError|Requested device|gum\.not_found/i.test(raw)) {
    return 'Nenhuma câmera/microfone encontrado neste aparelho.'
  }
  if (/NotAllowed|Permission|denied|gum\.permission/i.test(raw)) {
    return 'Permissão de câmera/microfone negada. Libere no navegador e tente de novo.'
  }
  if (/NotReadable|in use|Busy|gum\.not_readable/i.test(raw)) {
    return 'Câmera/microfone ocupados por outro app. Feche o outro app e tente de novo.'
  }
  return raw
}

const HD_VIDEO_CONSTRAINTS = {
  facingMode: 'user',
  width: { ideal: 1920, max: 1920, min: 640 },
  height: { ideal: 1080, max: 1080, min: 360 },
  frameRate: { ideal: 30, max: 30 },
}

async function createTracksWithFallbacks(JitsiMeetJS) {
  let lastError = null
  const attempts = [
    {
      devices: ['audio', 'video'],
      resolution: 1080,
      constraints: { video: HD_VIDEO_CONSTRAINTS },
    },
    {
      devices: ['audio', 'video'],
      resolution: 720,
      constraints: {
        video: {
          facingMode: 'user',
          width: { ideal: 1280, max: 1280, min: 640 },
          height: { ideal: 720, max: 720, min: 360 },
          frameRate: { ideal: 30, max: 30 },
        },
      },
    },
    { devices: ['audio', 'video'], resolution: 720 },
    { devices: ['audio', 'video'] },
    { devices: ['video'] },
    { devices: ['audio'] },
  ]

  for (const attempt of attempts) {
    try {
      const tracks = await JitsiMeetJS.createLocalTracks(attempt)
      const list = Array.isArray(tracks) ? tracks : []
      for (const track of list) {
        try { if (track.isMuted?.()) await track.unmute() } catch { /* ignore */ }
      }
      return {
        tracks: list,
        warning: attempt.devices.length < 2 ? 'Entrando só com o dispositivo disponível.' : '',
      }
    } catch (err) {
      lastError = err
    }
  }

  return { tracks: [], warning: friendlyMediaError(lastError) }
}

/** Pré-carrega a lib enquanto o usuário lê o gate (mantém o toque “quente”). */
export async function preloadJitsiLib(domain = DEFAULT_DOMAIN) {
  const cleanDomain = String(domain || DEFAULT_DOMAIN).replace(/^https?:\/\//, '').replace(/\/+$/, '')
  const JitsiMeetJS = await loadLib(cleanDomain)
  ensureInit(JitsiMeetJS)
  return JitsiMeetJS
}

/**
 * Cria tracks no gesto do usuário (botão “Permitir câmera”).
 * Deve ser chamado no click — não depois de awaits longos sem a lib pré-carregada.
 */
export async function prepareJitsiLocalTracks(domain = DEFAULT_DOMAIN) {
  const cleanDomain = String(domain || DEFAULT_DOMAIN).replace(/^https?:\/\//, '').replace(/\/+$/, '')
  const JitsiMeetJS = await preloadJitsiLib(cleanDomain)
  const result = await createTracksWithFallbacks(JitsiMeetJS)
  return {
    tracks: markRaw(result.tracks || []),
    warning: result.warning || '',
  }
}

export function useJitsiMediaCall() {
  const status = ref('idle')
  const error = ref('')
  const participants = ref([])
  const localAudioMuted = ref(false)
  const localVideoMuted = ref(false)
  const handRaised = ref(false)
  const toasts = ref([])
  const trackTick = ref(0)
  const mediaWarning = ref('')
  const chatMessages = ref([])
  const unreadChat = ref(0)
  const chatOpen = ref(false)
  const isSharingScreen = ref(false)
  const noiseSuppression = ref(false)
  const backgroundMode = ref('none') // none | blur | soft | image:<id>
  const backgroundImageUrl = ref('')
  const lobbyEnabled = ref(false)
  const lobbySupported = ref(false)
  const isModerator = ref(false)
  const lobbyPending = ref([])
  const floatingReactions = ref([])
  const inLobby = ref(false)
  const cameraFacing = ref('user')
  const speakerMuted = ref(false)
  /** participantId -> 0..1 nível de áudio (fala) */
  const audioLevels = ref({})
  /** Dispositivos (estilo Configurações do Jitsi Meet) */
  const audioInputDevices = ref([])
  const videoInputDevices = ref([])
  const audioOutputDevices = ref([])
  const selectedMicId = ref('')
  const selectedCamId = ref('')
  const selectedSpeakerId = ref('')
  const audioOutputSupported = ref(false)
  const isRecording = ref(false)

  let JitsiMeetJS = null
  let connection = null
  let conference = null
  let localTracks = []
  let remoteTracks = new Map()
  /** participantId -> boolean */
  let remoteHands = new Map()
  let disposed = false
  let toastSeq = 0
  let chatSeq = 0
  let reactionSeq = 0
  let localDisplayName = 'Você'
  let desktopTrack = null
  let cameraTrackBackup = null
  let role = 'guest'
  let deviceChangeHandler = null
  const remoteAudioElements = new Set()
  /** participantId -> last speaking timestamp */
  const speakingUntil = new Map()
  let audioLevelRaf = 0

  function bumpTracks() {
    trackTick.value += 1
  }

  const SPEAKING_THRESHOLD = 0.018
  const SPEAKING_HOLD_MS = 280

  function setAudioLevel(participantId, level) {
    if (!participantId) return
    const n = Math.max(0, Math.min(1, Number(level) || 0))
    const prev = audioLevels.value[participantId] || 0
    // Suaviza um pouco pra animação não tremer
    const smoothed = prev * 0.35 + n * 0.65
    if (smoothed >= SPEAKING_THRESHOLD) {
      speakingUntil.set(participantId, Date.now() + SPEAKING_HOLD_MS)
    }
    const hold = speakingUntil.get(participantId) || 0
    const active = Date.now() < hold
    const nextLevel = active ? Math.max(smoothed, SPEAKING_THRESHOLD) : 0
    if (Math.abs((audioLevels.value[participantId] || 0) - nextLevel) < 0.012) {
      return
    }
    audioLevels.value = {
      ...audioLevels.value,
      [participantId]: nextLevel,
    }
  }

  function onTrackAudioLevelChanged(idOrLevel, maybeLevel) {
    // Formatos: (participantId, level) | (level) em track local
    if (typeof idOrLevel === 'string') {
      setAudioLevel(idOrLevel, maybeLevel)
      return
    }
    if (typeof idOrLevel === 'number' && conference) {
      const localId = conference.myUserId?.() || 'local'
      setAudioLevel(localId, idOrLevel)
    }
  }

  function clearAudioLevels() {
    audioLevels.value = {}
    speakingUntil.clear()
    if (audioLevelRaf) {
      cancelAnimationFrame(audioLevelRaf)
      audioLevelRaf = 0
    }
  }

  /** Som curto estilo Meet (sem toast) ao levantar a mão. */
  function playHandRaiseSound() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      const now = ctx.currentTime
      const gain = ctx.createGain()
      gain.connect(ctx.destination)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38)

      const osc1 = ctx.createOscillator()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(880, now)
      osc1.connect(gain)
      osc1.start(now)
      osc1.stop(now + 0.18)

      const osc2 = ctx.createOscillator()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(1174.7, now + 0.12)
      osc2.connect(gain)
      osc2.start(now + 0.12)
      osc2.stop(now + 0.38)

      setTimeout(() => {
        try { ctx.close() } catch { /* ignore */ }
      }, 500)
    } catch {
      /* ignore — áudio opcional */
    }
  }

  function pushToast(input) {
    const id = ++toastSeq
    const kind = input.kind || 'info'
    toasts.value = [
      {
        id,
        title: input.title || '',
        body: input.body || '',
        kind,
      },
      ...toasts.value,
    ].slice(0, 3)
    const ttl = kind === 'chat' ? 6000
      : kind === 'hand' ? 0
      : kind === 'join' ? 4500
      : 3600
    if (ttl > 0) setTimeout(() => dismissToast(id), ttl)
    return id
  }

  function dismissToast(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function syncParticipants() {
    if (!conference) {
      participants.value = []
      return
    }
    const list = []
    const localId = conference.myUserId?.() || 'local'
    list.push({
      id: localId,
      name: 'Você',
      isLocal: true,
      audioMuted: localAudioMuted.value,
      videoMuted: localVideoMuted.value,
      handRaised: handRaised.value,
    })

    for (const p of (conference.getParticipants?.() || [])) {
      const id = p.getId?.() || p._id
      if (!id) continue
      const bag = remoteTracks.get(id)
      const hasVideo = !!bag?.video && !bag.video.isMuted?.()
      const hasAudio = !!bag?.audio && !bag.audio.isMuted?.()
      const raisedProp = p.getProperty?.('raisedHand')
      const handUp = remoteHands.has(id)
        ? !!remoteHands.get(id)
        : !!(p.hasRaisedHand?.() || (raisedProp && raisedProp !== 'false' && raisedProp !== 0))
      list.push({
        id,
        name: p.getDisplayName?.() || 'Participante',
        isLocal: false,
        audioMuted: bag?.audio ? !hasAudio : true,
        videoMuted: bag?.video ? !hasVideo : true,
        handRaised: handUp,
      })
    }
    participants.value = list
  }

  function getLocalTrack(type) {
    return localTracks.find((t) => t.getType() === type) || null
  }

  function deviceLabel(device, fallback) {
    const label = String(device?.label || '').trim()
    if (label) return label
    const id = String(device?.deviceId || '').slice(0, 8)
    return id ? `${fallback} (${id})` : fallback
  }

  function syncSelectedDeviceIds() {
    const mic = getLocalTrack('audio')
    const cam = getLocalTrack('video')
    try {
      const micId = mic?.getDeviceId?.() || mic?.getTrack?.()?.getSettings?.()?.deviceId || ''
      if (micId) selectedMicId.value = micId
    } catch { /* ignore */ }
    try {
      const camId = cam?.getDeviceId?.() || cam?.getTrack?.()?.getSettings?.()?.deviceId || ''
      if (camId) selectedCamId.value = camId
    } catch { /* ignore */ }
    try {
      const out = JitsiMeetJS?.mediaDevices?.getAudioOutputDevice?.()
      if (out) selectedSpeakerId.value = out
    } catch { /* ignore */ }
  }

  async function refreshMediaDevices() {
    if (typeof navigator === 'undefined') return []
    try {
      // Prefer API do lib-jitsi-meet; fallback nativo
      const list = await new Promise((resolve) => {
        const md = JitsiMeetJS?.mediaDevices
        if (md && typeof md.enumerateDevices === 'function') {
          try {
            const maybe = md.enumerateDevices((devices) => resolve(Array.isArray(devices) ? devices : []))
            if (maybe && typeof maybe.then === 'function') {
              maybe.then((devices) => resolve(Array.isArray(devices) ? devices : [])).catch(() => resolve([]))
            }
            return
          } catch { /* fallback */ }
        }
        if (!navigator.mediaDevices?.enumerateDevices) {
          resolve([])
          return
        }
        navigator.mediaDevices.enumerateDevices()
          .then((devices) => resolve(Array.isArray(devices) ? devices : []))
          .catch(() => resolve([]))
      })

      audioInputDevices.value = list
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({ deviceId: d.deviceId, label: deviceLabel(d, 'Microfone'), kind: d.kind }))
      videoInputDevices.value = list
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({ deviceId: d.deviceId, label: deviceLabel(d, 'Câmera'), kind: d.kind }))
      audioOutputDevices.value = list
        .filter((d) => d.kind === 'audiooutput')
        .map((d) => ({ deviceId: d.deviceId, label: deviceLabel(d, 'Alto-falante'), kind: d.kind }))

      audioOutputSupported.value = !!(
        JitsiMeetJS?.mediaDevices?.isDeviceChangeAvailable?.('output')
        || (typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype)
      )

      syncSelectedDeviceIds()
      if (!selectedMicId.value && audioInputDevices.value[0]) {
        selectedMicId.value = audioInputDevices.value[0].deviceId
      }
      if (!selectedCamId.value && videoInputDevices.value[0]) {
        selectedCamId.value = videoInputDevices.value[0].deviceId
      }
      if (!selectedSpeakerId.value && audioOutputDevices.value[0]) {
        selectedSpeakerId.value = audioOutputDevices.value[0].deviceId
      }
      return list
    } catch (err) {
      console.warn('[jitsi-media] enumerateDevices failed', err)
      return []
    }
  }

  function bindDeviceChangeListener() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return
    if (deviceChangeHandler) {
      try { navigator.mediaDevices.removeEventListener('devicechange', deviceChangeHandler) } catch { /* ignore */ }
    }
    deviceChangeHandler = () => { void refreshMediaDevices() }
    try { navigator.mediaDevices.addEventListener('devicechange', deviceChangeHandler) } catch { /* ignore */ }
  }

  async function replaceLocalTrack(type, nextTrack) {
    if (!conference || !nextTrack) throw new Error('Track indisponível.')
    const current = getLocalTrack(type)
    if (current && typeof conference.replaceTrack === 'function') {
      await conference.replaceTrack(current, nextTrack)
    } else if (current) {
      try { await conference.removeTrack(current) } catch { /* ignore */ }
      await conference.addTrack(nextTrack)
    } else {
      await conference.addTrack(nextTrack)
    }
    if (current) {
      localTracks = localTracks.filter((t) => t !== current)
      try { await current.dispose() } catch { /* ignore */ }
    }
    localTracks.push(nextTrack)
    bumpTracks()
    syncParticipants()
    syncSelectedDeviceIds()
  }

  async function setMicrophone(deviceId) {
    const id = String(deviceId || '').trim()
    if (!id || !JitsiMeetJS || !conference || status.value !== 'live') return false
    if (id === selectedMicId.value) return true
    const wasMuted = !!getLocalTrack('audio')?.isMuted?.()
    const hadNoise = noiseSuppression.value
    try {
      const created = await JitsiMeetJS.createLocalTracks({
        devices: ['audio'],
        micDeviceId: id,
      })
      const next = (Array.isArray(created) ? created : []).find((t) => t.getType() === 'audio')
      if (!next) throw new Error('Microfone não disponível.')
      await replaceLocalTrack('audio', next)
      selectedMicId.value = id
      if (wasMuted) {
        try { await next.mute() } catch { /* ignore */ }
        localAudioMuted.value = true
      } else {
        localAudioMuted.value = !!next.isMuted?.()
      }
      if (hadNoise) {
        try { await setNoiseSuppression(true) } catch { /* ignore */ }
      }
      return true
    } catch (err) {
      pushToast({
        title: 'Microfone',
        body: friendlyMediaError(err) || 'Não foi possível trocar o microfone.',
        kind: 'error',
      })
      return false
    }
  }

  async function setCamera(deviceId) {
    const id = String(deviceId || '').trim()
    if (!id || !JitsiMeetJS || !conference || status.value !== 'live') return false
    if (isSharingScreen.value) {
      pushToast({
        title: 'Câmera',
        body: 'Pare o compartilhamento de tela para trocar a câmera.',
        kind: 'error',
      })
      return false
    }
    if (id === selectedCamId.value) return true
    const wasMuted = !!getLocalTrack('video')?.isMuted?.()
    const prevBgMode = backgroundMode.value
    const prevBgUrl = backgroundImageUrl.value
    try {
      if (prevBgMode !== 'none') {
        const current = getLocalTrack('video')
        if (current && typeof current.setEffect === 'function') {
          try { await current.setEffect(undefined) } catch { /* ignore */ }
        }
      }
      const created = await JitsiMeetJS.createLocalTracks({
        devices: ['video'],
        cameraDeviceId: id,
        constraints: {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
        },
      })
      const next = (Array.isArray(created) ? created : []).find((t) => t.getType() === 'video')
      if (!next) throw new Error('Câmera não disponível.')
      await replaceLocalTrack('video', next)
      selectedCamId.value = id
      if (wasMuted) {
        try { await next.mute() } catch { /* ignore */ }
        localVideoMuted.value = true
      } else {
        localVideoMuted.value = !!next.isMuted?.()
      }
      if (prevBgMode && prevBgMode !== 'none' && !wasMuted) {
        try { await setBackground(prevBgMode, prevBgUrl) } catch { /* ignore */ }
      }
      return true
    } catch (err) {
      pushToast({
        title: 'Câmera',
        body: friendlyMediaError(err) || 'Não foi possível trocar a câmera.',
        kind: 'error',
      })
      return false
    }
  }

  async function setSpeaker(deviceId) {
    const id = String(deviceId || '').trim()
    if (!id) return false
    try {
      if (JitsiMeetJS?.mediaDevices?.setAudioOutputDevice) {
        await JitsiMeetJS.mediaDevices.setAudioOutputDevice(id)
      } else {
        const tasks = []
        for (const el of remoteAudioElements) {
          if (el && typeof el.setSinkId === 'function') {
            tasks.push(el.setSinkId(id).catch(() => {}))
          }
        }
        await Promise.all(tasks)
      }
      selectedSpeakerId.value = id
      return true
    } catch (err) {
      pushToast({
        title: 'Áudio',
        body: friendlyMediaError(err) || 'Não foi possível trocar a saída de áudio.',
        kind: 'error',
      })
      return false
    }
  }

  function playTestSound() {
    if (typeof window === 'undefined') return
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.value = 0.0001
      osc.connect(gain)
      gain.connect(ctx.destination)
      const now = ctx.currentTime
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
      osc.start(now)
      osc.stop(now + 0.4)
      setTimeout(() => { try { ctx.close() } catch { /* ignore */ } }, 500)
    } catch (err) {
      console.warn('[jitsi-media] test sound failed', err)
    }
  }

  function getLocalMicLevel() {
    const localId = conference?.myUserId?.() || 'local'
    return getAudioLevel(localId)
  }

  function getRemoteTrack(participantId, type) {
    return remoteTracks.get(participantId)?.[type] || null
  }

  function reattachTrackElements(track) {
    if (!track?.containers?.length) return
    const els = [...track.containers]
    for (const el of els) {
      try { track.detach(el) } catch { /* ignore */ }
      try { track.attach(el) } catch { /* ignore */ }
      if (el instanceof HTMLVideoElement) {
        el.removeAttribute('disablePictureInPicture')
      }
      el.play?.().catch?.(() => {})
    }
  }

  function attachTrackToEl(track, el) {
    if (!track || !el) return
    try {
      if (track.getType?.() === 'audio' && !track.isLocal?.()) {
        remoteAudioElements.add(el)
        el.muted = speakerMuted.value
      }

      const already = !!track.containers?.includes?.(el)
      if (already) {
        if (el instanceof HTMLVideoElement) {
          el.removeAttribute('disablePictureInPicture')
        }
        el.play?.().catch?.(() => {})
        return
      }

      track.attach(el)
      el.autoplay = true
      el.playsInline = true
      if (el instanceof HTMLVideoElement) {
        el.removeAttribute('disablePictureInPicture')
      }
      el.muted = track.isLocal?.() && track.getType?.() === 'video'
        ? true
        : (track.getType?.() === 'audio' && !track.isLocal?.() ? speakerMuted.value : el.muted)
      el.play?.().catch?.(() => {})
    } catch (err) {
      console.warn('[jitsi-media] attach failed', err)
    }
  }

  function finalizeLocalTracks(tracks, warning = '') {
    localTracks = Array.isArray(tracks) ? tracks : []
    localAudioMuted.value = !localTracks.some((t) => t.getType() === 'audio')
      || !!localTracks.find((t) => t.getType() === 'audio')?.isMuted()
    localVideoMuted.value = !localTracks.some((t) => t.getType() === 'video')
      || !!localTracks.find((t) => t.getType() === 'video')?.isMuted()
    bumpTracks()
    return { tracks: localTracks, warning }
  }

  async function createLocalTracks() {
    const result = await createTracksWithFallbacks(JitsiMeetJS)
    return finalizeLocalTracks(result.tracks, result.warning)
  }

  function applyHighQuality() {
    if (!conference) return
    try {
      // Pede 1080p no envio e no recebimento (consulta 1:1).
      conference.setSenderVideoConstraint?.(1080)
      conference.setReceiverVideoConstraint?.(1080)

      const constraints = {
        lastN: -1,
        assumedBandwidthBps: 8_000_000,
        defaultConstraints: { maxHeight: 1080 },
      }

      // Força HD por participante remoto (quando a API existir).
      try {
        const perSource = {}
        for (const p of (conference.getParticipants?.() || [])) {
          const id = p.getId?.() || p._id
          if (id) perSource[id] = { maxHeight: 1080 }
        }
        if (Object.keys(perSource).length) constraints.constraints = perSource
      } catch { /* ignore */ }

      if (typeof conference.setReceiverConstraints === 'function') {
        conference.setReceiverConstraints(constraints)
      }
    } catch {
      // ignore
    }
  }

  function storeRemoteTrack(track) {
    const pid = track.getParticipantId?.()
    if (!pid) return false
    const type = track.getType?.()
    const key = type === 'audio' ? 'audio' : 'video'
    const bag = remoteTracks.get(pid) || {}
    bag[key] = track
    remoteTracks.set(pid, bag)
    return true
  }

  function onTrackAdded(track) {
    if (track.isLocal?.()) return
    if (!storeRemoteTrack(track)) {
      setTimeout(() => {
        if (storeRemoteTrack(track)) {
          bumpTracks()
          syncParticipants()
          applyHighQuality()
        }
      }, 400)
      return
    }
    bumpTracks()
    syncParticipants()
    applyHighQuality()
  }

  function onTrackMuteChanged(track) {
    if (track?.isLocal?.()) {
      if (track.getType() === 'audio') localAudioMuted.value = track.isMuted()
      if (track.getType() === 'video') localVideoMuted.value = track.isMuted()
    }
    bumpTracks()
    syncParticipants()
  }

  function onTrackRemoved(track) {
    if (track.isLocal?.()) return
    const pid = track.getParticipantId()
    if (!pid) return
    detachTrack(track)
    const bag = remoteTracks.get(pid)
    if (bag) {
      const key = track.getType?.() === 'audio' ? 'audio' : 'video'
      if (bag[key] === track) delete bag[key]
      if (!bag.audio && !bag.video) remoteTracks.delete(pid)
      else remoteTracks.set(pid, bag)
    }
    bumpTracks()
    syncParticipants()
  }

  function onUserJoined(_id, user) {
    syncParticipants()
    pushToast({
      title: user?.getDisplayName?.() || 'Participante',
      body: 'entrou na consulta.',
      kind: 'join',
    })
  }

  function onUserLeft(id) {
    const bag = remoteTracks.get(id)
    if (bag?.audio) detachTrack(bag.audio)
    if (bag?.video) detachTrack(bag.video)
    remoteTracks.delete(id)
    remoteHands.delete(id)
    bumpTracks()
    syncParticipants()
  }

  function pushChatMessage({ from, text, isLocal = false }) {
    const body = String(text || '').trim()
    if (!body) return
    chatSeq += 1
    chatMessages.value = [
      ...chatMessages.value,
      {
        id: chatSeq,
        from: from || (isLocal ? 'Você' : 'Participante'),
        text: body.slice(0, 1000),
        isLocal: !!isLocal,
        at: Date.now(),
      },
    ].slice(-120)

    if (!isLocal && !chatOpen.value) {
      unreadChat.value += 1
      // Remove toasts de chat anteriores — Meet mostra só o último preview
      toasts.value = toasts.value.filter((t) => t.kind !== 'chat')
      pushToast({
        title: from || 'Participante',
        body: body.length > 60 ? `${body.slice(0, 60)}…` : body,
        kind: 'chat',
      })
    }
  }

  function extractChatText(payload) {
    if (payload == null) return ''
    if (typeof payload === 'string') return payload
    if (typeof payload === 'object') {
      if (typeof payload.message === 'string') return payload.message
      if (typeof payload.text === 'string') return payload.text
      if (typeof payload.body === 'string') return payload.body
      if (typeof payload.data === 'string') return payload.data
      if (payload.data && typeof payload.data === 'object') {
        return extractChatText(payload.data)
      }
    }
    return ''
  }

  function onMessageReceived(...args) {
    // Formatos comuns:
    // (id, text, ts) | (id, { message }) | (participant, text)
    const a0 = args[0]
    const a1 = args[1]
    let senderId = null
    let text = ''

    if (typeof a0 === 'string') {
      senderId = a0
      text = extractChatText(a1)
    } else if (a0 && typeof a0.getId === 'function') {
      senderId = a0.getId()
      text = extractChatText(a1 != null ? a1 : a0)
    } else {
      text = extractChatText(a0) || extractChatText(a1)
      senderId = typeof a1 === 'string' ? a1 : null
    }

    if (!text) return
    const localId = conference?.myUserId?.()
    if (senderId && localId && senderId === localId) return

    const name = senderId
      ? (conference?.getParticipantById?.(senderId)?.getDisplayName?.() || 'Participante')
      : 'Participante'
    pushChatMessage({ from: name, text, isLocal: false })
  }

  function setChatOpen(open) {
    chatOpen.value = !!open
    if (chatOpen.value) {
      unreadChat.value = 0
      toasts.value = toasts.value.filter((t) => t.kind !== 'chat')
    }
  }

  function sendChatMessage(raw) {
    const text = String(raw || '').trim()
    if (!text || !conference || status.value !== 'live') return false
    try {
      if (typeof conference.sendTextMessage === 'function') {
        conference.sendTextMessage(text)
      } else if (typeof conference.sendMessage === 'function') {
        conference.sendMessage(text)
      } else {
        return false
      }
      pushChatMessage({ from: localDisplayName || 'Você', text, isLocal: true })
      return true
    } catch (err) {
      console.warn('[jitsi-media] sendChat failed', err)
      pushToast({ title: 'Chat', body: 'Não foi possível enviar a mensagem.', kind: 'info' })
      return false
    }
  }

  function parseRaisedHandValue(value) {
    if (value === true || value === 'true') return true
    if (value === false || value === 'false' || value == null || value === '' || value === 0 || value === '0') {
      return false
    }
    if (typeof value === 'number') return value > 0
    if (typeof value === 'string') {
      const n = Number(value)
      if (!Number.isNaN(n)) return n > 0
      return value.length > 0
    }
    return !!value
  }

  function onRaiseHandUpdated(id, raised) {
    if (!id || !conference) return
    const localId = conference.myUserId?.()
    if (id === localId) {
      handRaised.value = !!raised
      syncParticipants()
      return
    }

    const wasRaised = !!remoteHands.get(id)
    remoteHands.set(id, !!raised)
    syncParticipants()

    if (!raised || wasRaised) return
    // Meet: só som + badge no tile — sem toast de notificação
    playHandRaiseSound()
  }

  function handleRaiseHandEvent(...args) {
    // Formatos possíveis do lib-jitsi-meet:
    // (participantId, timestamp|boolean)
    // (participant, timestamp|boolean)
    // ({ id, handRaised })
    let id = null
    let raw = null
    const a0 = args[0]
    const a1 = args[1]

    if (a0 && typeof a0 === 'object' && !a0.getId && ('id' in a0 || 'handRaised' in a0)) {
      id = a0.id || a0.participantId
      raw = 'handRaised' in a0 ? a0.handRaised : a1
    } else if (typeof a0 === 'string') {
      id = a0
      raw = a1
    } else if (a0 && typeof a0.getId === 'function') {
      id = a0.getId()
      raw = a1 != null ? a1 : a0.getProperty?.('raisedHand')
    }

    if (!id) return
    onRaiseHandUpdated(id, parseRaisedHandValue(raw))
  }

  function onParticipantPropertyChanged(participant, propertyName, oldValue, newValue) {
    if (propertyName !== 'raisedHand') return
    const id = typeof participant === 'string' ? participant : participant?.getId?.()
    if (!id) return
    onRaiseHandUpdated(id, parseRaisedHandValue(newValue))
  }

  function pushFloatingReaction(emoji, from = '') {
    reactionSeq += 1
    const id = reactionSeq
    floatingReactions.value = [
      ...floatingReactions.value,
      { id, emoji, from, left: 18 + Math.random() * 64 },
    ].slice(-12)
    setTimeout(() => {
      floatingReactions.value = floatingReactions.value.filter((r) => r.id !== id)
    }, 2600)
  }

  function onEndpointMessageReceived(_participant, payload) {
    const data = payload && typeof payload === 'object' ? payload : null
    if (!data || data.type !== 'cf-reaction' || !data.emoji) return
    const from = data.from || 'Participante'
    pushFloatingReaction(data.emoji, from)
    // Toast de reação só no host (admin) — no PWA do paciente cobre o topo
    if (role === 'host') {
      pushToast({ title: from, body: data.emoji, kind: 'info' })
    }
  }

  function onLobbyUserJoined(id, name) {
    if (!id || role !== 'host') return
    const exists = lobbyPending.value.some((p) => p.id === id)
    if (exists) return
    lobbyPending.value = [
      ...lobbyPending.value,
      { id, name: name || 'Paciente' },
    ]
    pushToast({
      title: name || 'Paciente',
      body: 'quer entrar na sala.',
      kind: 'join',
    })
  }

  function onLobbyUserLeft(id) {
    lobbyPending.value = lobbyPending.value.filter((p) => p.id !== id)
  }

  async function join({
    domain = DEFAULT_DOMAIN,
    roomName,
    displayName = 'Participante',
    preparedTracks = null,
    preparedWarning = '',
    callRole = 'guest',
  }) {
    disposed = false
    error.value = ''
    status.value = 'connecting'
    toasts.value = []
    mediaWarning.value = ''
    remoteTracks = new Map()
    remoteHands = new Map()
    handRaised.value = false
    participants.value = []
    chatMessages.value = []
    unreadChat.value = 0
    chatOpen.value = false
    isSharingScreen.value = false
    noiseSuppression.value = false
    backgroundMode.value = 'none'
    backgroundImageUrl.value = ''
    lobbyEnabled.value = false
    lobbySupported.value = false
    isModerator.value = false
    lobbyPending.value = []
    floatingReactions.value = []
    inLobby.value = false
    desktopTrack = null
    cameraTrackBackup = null
    clearAudioLevels()
    role = callRole === 'host' ? 'host' : 'guest'
    localDisplayName = String(displayName || 'Você').trim() || 'Você'

    const cleanDomain = String(domain || DEFAULT_DOMAIN).replace(/^https?:\/\//, '').replace(/\/+$/, '')
    const room = String(roomName || '').trim().toLowerCase()
    if (!room) {
      status.value = 'error'
      error.value = 'Sala inválida.'
      throw new Error(error.value)
    }

    JitsiMeetJS = await loadLib(cleanDomain)
    if (disposed) return
    ensureInit(JitsiMeetJS)

    if (Array.isArray(preparedTracks) && preparedTracks.length) {
      finalizeLocalTracks(preparedTracks, preparedWarning || '')
      if (preparedWarning) {
        mediaWarning.value = preparedWarning
        pushToast({ title: 'Mídia', body: preparedWarning, kind: 'info' })
      }
    } else {
      const media = await createLocalTracks()
      if (media.warning) {
        mediaWarning.value = media.warning
        pushToast({ title: 'Mídia', body: media.warning, kind: 'info' })
      }
    }

    connection = new JitsiMeetJS.JitsiConnection(null, null, {
      hosts: {
        domain: XMPP_DOMAIN,
        muc: MUC_DOMAIN,
      },
      serviceUrl: `wss://${cleanDomain}/xmpp-websocket`,
      bosh: `https://${cleanDomain}/http-bind`,
      clientNode: 'https://jitsi.org/jitsimeet',
    })

    await new Promise((resolve, reject) => {
      const onOk = () => { cleanup(); resolve() }
      const onFail = (err) => {
        cleanup()
        reject(new Error(friendlyMediaError(err) || 'Falha na conexão com o servidor de vídeo.'))
      }
      function cleanup() {
        connection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, onOk)
        connection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, onFail)
      }
      connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, onOk)
      connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, onFail)
      connection.connect()
    })

    if (disposed) return

    conference = connection.initJitsiConference(room, {
      openBridgeChannel: 'websocket',
      p2p: {
        enabled: true,
        codecPreferenceOrder: ['VP9', 'VP8', 'H264'],
      },
      channelLastN: -1,
      startLastN: -1,
      videoQuality: {
        codecPreferenceOrder: ['VP9', 'VP8', 'H264'],
        mobileCodecPreferenceOrder: ['VP9', 'VP8', 'H264'],
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

    conference.on(JitsiMeetJS.events.conference.TRACK_ADDED, onTrackAdded)
    conference.on(JitsiMeetJS.events.conference.TRACK_REMOVED, onTrackRemoved)
    conference.on(JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, onTrackMuteChanged)
    conference.on(JitsiMeetJS.events.conference.USER_JOINED, onUserJoined)
    conference.on(JitsiMeetJS.events.conference.USER_LEFT, onUserLeft)
    conference.on(JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED, syncParticipants)
    conference.on(JitsiMeetJS.events.conference.CONFERENCE_LEFT, () => {
      if (!disposed) status.value = 'left'
    })

    const audioLevelEvt = JitsiMeetJS.events.conference.TRACK_AUDIO_LEVEL_CHANGED
    if (audioLevelEvt) {
      conference.on(audioLevelEvt, onTrackAudioLevelChanged)
    }

    try {
      for (const p of (conference.getParticipants?.() || [])) {
        for (const t of (p.getTracks?.() || [])) onTrackAdded(t)
      }
    } catch { /* ignore */ }

    const raiseEvt = JitsiMeetJS.events.conference.RAISE_HAND_UPDATED
      || JitsiMeetJS.events.conference.PARTICIPANT_RAISE_HAND_CHANGED
    if (raiseEvt) {
      conference.on(raiseEvt, handleRaiseHandEvent)
    }

    const propEvt = JitsiMeetJS.events.conference.PARTICIPANT_PROPERTY_CHANGED
    if (propEvt) {
      conference.on(propEvt, onParticipantPropertyChanged)
    }

    const msgEvt = JitsiMeetJS.events.conference.MESSAGE_RECEIVED
    if (msgEvt) conference.on(msgEvt, onMessageReceived)
    const privEvt = JitsiMeetJS.events.conference.PRIVATE_MESSAGE_RECEIVED
    if (privEvt) conference.on(privEvt, onMessageReceived)

    const endpointEvt = JitsiMeetJS.events.conference.ENDPOINT_MESSAGE_RECEIVED
    if (endpointEvt) conference.on(endpointEvt, onEndpointMessageReceived)

    const lobbyJoinedEvt = JitsiMeetJS.events.conference.LOBBY_USER_JOINED
    if (lobbyJoinedEvt) conference.on(lobbyJoinedEvt, onLobbyUserJoined)
    const lobbyLeftEvt = JitsiMeetJS.events.conference.LOBBY_USER_LEFT
    if (lobbyLeftEvt) conference.on(lobbyLeftEvt, onLobbyUserLeft)
    const lobbyUpdatedEvt = JitsiMeetJS.events.conference.LOBBY_USER_UPDATED
    if (lobbyUpdatedEvt) {
      conference.on(lobbyUpdatedEvt, (id, participant) => {
        const name = participant?.name || participant?.displayName || 'Paciente'
        const idx = lobbyPending.value.findIndex((p) => p.id === id)
        if (idx >= 0) {
          const next = [...lobbyPending.value]
          next[idx] = { ...next[idx], name }
          lobbyPending.value = next
        } else {
          onLobbyUserJoined(id, name)
        }
      })
    }

    const recEvt = JitsiMeetJS.events.conference.RECORDING_STATUS_CHANGED
    if (recEvt) {
      conference.on(recEvt, (payload) => {
        const on = payload?.on === true
          || payload?.status === 'on'
          || payload?.mode === 'file'
          || payload?.mode === 'stream'
        isRecording.value = !!on
      })
    }

    conference.setDisplayName(displayName)

    await new Promise((resolve, reject) => {
      const onJoined = async () => {
        if (disposed) {
          cleanupJoin()
          resolve()
          return
        }
        cleanupJoin()
        inLobby.value = false
        try {
          for (const track of localTracks) {
            await conference.addTrack(track)
          }
        } catch (err) {
          reject(err)
          return
        }
        applyHighQuality()
        setTimeout(applyHighQuality, 800)
        setTimeout(applyHighQuality, 2500)
        syncParticipants()
        isModerator.value = !!conference.isModerator?.()
        lobbySupported.value = !!conference.isLobbySupported?.()
        if (role === 'host') {
          isModerator.value = true
          lobbySupported.value = lobbySupported.value || typeof conference.enableLobby === 'function'
          // Sala de espera ligada por padrão na consulta (nutri aprova o paciente)
          if (typeof conference.enableLobby === 'function') {
            try {
              await conference.enableLobby()
              lobbyEnabled.value = true
            } catch (err) {
              console.warn('[jitsi-media] auto lobby failed', err)
            }
          }
        }
        status.value = 'live'
        bindDeviceChangeListener()
        void refreshMediaDevices()
        resolve()
      }
      const onFailed = async (errCode, ...rest) => {
        if (disposed) {
          cleanupJoin()
          resolve()
          return
        }
        const code = String(
          typeof errCode === 'string'
            ? errCode
            : (errCode?.message || errCode?.name || errCode || ''),
        )
        const blob = `${code} ${rest.map((x) => String(x)).join(' ')}`
        const membersOnly = /membersOnly|member.?only|not-authorized|authentication.?required/i.test(blob)

        if (membersOnly && role === 'guest' && typeof conference.joinLobby === 'function') {
          inLobby.value = true
          status.value = 'lobby'
          try {
            await conference.joinLobby(displayName, '')
            return
          } catch (lobbyErr) {
            cleanupJoin()
            reject(new Error(friendlyMediaError(lobbyErr) || 'Não foi possível entrar na sala de espera.'))
            return
          }
        }

        cleanupJoin()
        const msg = typeof errCode === 'string' && errCode && errCode !== 'undefined'
          ? errCode
          : 'Não foi possível entrar na sala.'
        reject(new Error(msg))
      }
      function cleanupJoin() {
        conference.off(JitsiMeetJS.events.conference.CONFERENCE_JOINED, onJoined)
        conference.off(JitsiMeetJS.events.conference.CONFERENCE_FAILED, onFailed)
      }
      conference.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, onJoined)
      conference.on(JitsiMeetJS.events.conference.CONFERENCE_FAILED, onFailed)
      conference.join()
    })
  }

  async function ensureLocalTrack(type) {
    let track = getLocalTrack(type)
    if (track) return track
    if (!JitsiMeetJS || !conference) return null
    try {
      const created = await JitsiMeetJS.createLocalTracks({ devices: [type] })
      for (const t of (Array.isArray(created) ? created : [])) {
        if (t.getType() !== type) continue
        await conference.addTrack(t)
        localTracks.push(t)
        track = t
      }
      bumpTracks()
      return track
    } catch (err) {
      mediaWarning.value = friendlyMediaError(err)
      pushToast({
        title: type === 'video' ? 'Câmera' : 'Microfone',
        body: mediaWarning.value,
        kind: 'info',
      })
      return null
    }
  }

  async function toggleAudio() {
    const track = await ensureLocalTrack('audio')
    if (!track) return
    try {
      if (track.isMuted()) await track.unmute()
      else await track.mute()
      localAudioMuted.value = track.isMuted()
      syncParticipants()
    } catch (err) {
      pushToast({ title: 'Microfone', body: friendlyMediaError(err), kind: 'info' })
    }
  }

  async function toggleVideo() {
    const track = await ensureLocalTrack('video')
    if (!track) return
    try {
      if (track.isMuted()) await track.unmute()
      else await track.mute()
      localVideoMuted.value = track.isMuted()
      bumpTracks()
      syncParticipants()
    } catch (err) {
      pushToast({ title: 'Câmera', body: friendlyMediaError(err), kind: 'info' })
    }
  }

  async function flipCamera() {
    if (!JitsiMeetJS || !conference || status.value !== 'live' || isSharingScreen.value) {
      pushToast({
        title: 'Câmera',
        body: isSharingScreen.value
          ? 'Pare o compartilhamento para inverter a câmera.'
          : 'Câmera indisponível no momento.',
        kind: 'error',
      })
      return false
    }

    const current = getLocalTrack('video')
    if (!current) {
      pushToast({ title: 'Câmera', body: 'Ligue a câmera para inverter.', kind: 'error' })
      return false
    }
    if (current.isMuted?.()) {
      pushToast({ title: 'Câmera', body: 'Ligue a câmera para inverter.', kind: 'error' })
      return false
    }

    const nextFacing = cameraFacing.value === 'user' ? 'environment' : 'user'
    const prevFacing = cameraFacing.value
    const prevBgMode = backgroundMode.value
    const prevBgUrl = backgroundImageUrl.value

    async function swapIn(next) {
      if (!next) throw new Error('Nova câmera não disponível.')
      // Remove efeito antes de trocar (setEffect + replaceTrack brigam)
      if (typeof current.setEffect === 'function' && prevBgMode !== 'none') {
        try { await current.setEffect(undefined) } catch { /* ignore */ }
      }
      if (typeof conference.replaceTrack === 'function') {
        await conference.replaceTrack(current, next)
      } else {
        try { await conference.removeTrack(current) } catch { /* ignore */ }
        await conference.addTrack(next)
      }
      localTracks = localTracks.filter((t) => t !== current)
      localTracks.push(next)
      try { await current.dispose() } catch { /* ignore */ }
      cameraFacing.value = nextFacing
      localVideoMuted.value = !!next.isMuted?.()
      bumpTracks()
      syncParticipants()
      // Reaplica fundo se estava ativo
      if (prevBgMode && prevBgMode !== 'none') {
        try { await setBackground(prevBgMode, prevBgUrl) } catch { /* ignore */ }
      }
      return true
    }

    // 1) Tenta applyConstraints no track atual (mais rápido no mobile)
    try {
      const streamTrack = current.getTrack?.() || current.stream?.getVideoTracks?.()?.[0]
      if (streamTrack && typeof streamTrack.applyConstraints === 'function') {
        await streamTrack.applyConstraints({ facingMode: { ideal: nextFacing } })
        const applied = streamTrack.getSettings?.()?.facingMode
        if (!applied || applied === nextFacing || (nextFacing === 'environment' && applied !== 'user')) {
          cameraFacing.value = nextFacing
          bumpTracks()
          return true
        }
      }
    } catch {
      // segue para recriar track
    }

    // 2) Recria track com facingMode ideal
    try {
      const created = await JitsiMeetJS.createLocalTracks({
        devices: ['video'],
        constraints: {
          video: {
            facingMode: { ideal: nextFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
      })
      const next = (Array.isArray(created) ? created : []).find((t) => t.getType() === 'video')
      return await swapIn(next)
    } catch (err) {
      // 3) Último fallback: facingMode string simples
      try {
        const created = await JitsiMeetJS.createLocalTracks({
          devices: ['video'],
          constraints: { video: { facingMode: nextFacing } },
        })
        const next = (Array.isArray(created) ? created : []).find((t) => t.getType() === 'video')
        return await swapIn(next)
      } catch (err2) {
        cameraFacing.value = prevFacing
        pushToast({
          title: 'Câmera',
          body: friendlyMediaError(err2 || err) || 'Não foi possível inverter a câmera.',
          kind: 'error',
        })
        return false
      }
    }
  }

  function toggleSpeaker() {
    speakerMuted.value = !speakerMuted.value
    for (const el of remoteAudioElements) {
      try { el.muted = speakerMuted.value } catch { /* ignore */ }
    }
    return speakerMuted.value
  }

  async function toggleHand() {
    if (!conference || status.value !== 'live') return
    const next = !handRaised.value
    handRaised.value = next
    try {
      // lib-jitsi-meet usa timestamp em raisedHand (não boolean puro)
      if (typeof conference.raiseHand === 'function') {
        conference.raiseHand(next)
      } else {
        conference.setLocalParticipantProperty?.(
          'raisedHand',
          next ? Date.now() : undefined,
        )
      }
    } catch (err) {
      console.warn('[jitsi-media] raiseHand failed', err)
      try {
        conference.setLocalParticipantProperty?.(
          'raisedHand',
          next ? Date.now() : undefined,
        )
      } catch { /* ignore */ }
    }
    syncParticipants()
    if (next) playHandRaiseSound()
  }

  function sendReaction(emoji) {
    if (!conference || status.value !== 'live' || !emoji) return
    pushFloatingReaction(emoji, 'Você')
    try {
      if (typeof conference.sendReaction === 'function') {
        conference.sendReaction(emoji, String(Date.now()), '')
      }
      if (typeof conference.broadcastEndpointMessage === 'function') {
        conference.broadcastEndpointMessage({
          type: 'cf-reaction',
          emoji,
          from: localDisplayName,
        })
      } else if (typeof conference.sendEndpointMessage === 'function') {
        conference.sendEndpointMessage('', {
          type: 'cf-reaction',
          emoji,
          from: localDisplayName,
        })
      }
    } catch (err) {
      console.warn('[jitsi-media] reaction failed', err)
    }
  }

  async function toggleScreenShare() {
    if (!conference || !JitsiMeetJS || status.value !== 'live') return
    try {
      if (isSharingScreen.value && desktopTrack) {
        const camera = cameraTrackBackup
        if (camera) {
          await conference.replaceTrack(desktopTrack, camera)
          localTracks = localTracks.map((t) => (t === desktopTrack ? camera : t))
        } else {
          await conference.removeTrack(desktopTrack)
          localTracks = localTracks.filter((t) => t !== desktopTrack)
        }
        try { await desktopTrack.dispose() } catch { /* ignore */ }
        desktopTrack = null
        cameraTrackBackup = null
        isSharingScreen.value = false
        bumpTracks()
        syncParticipants()
        return
      }

      const created = await JitsiMeetJS.createLocalTracks({ devices: ['desktop'] })
      const desk = (Array.isArray(created) ? created : []).find((t) => t.getType?.() === 'video')
      if (!desk) throw new Error('Compartilhamento de tela indisponível.')

      const currentVideo = getLocalTrack('video')
      cameraTrackBackup = currentVideo
      if (currentVideo) {
        await conference.replaceTrack(currentVideo, desk)
        localTracks = localTracks.map((t) => (t === currentVideo ? desk : t))
      } else {
        await conference.addTrack(desk)
        localTracks.push(desk)
      }
      desktopTrack = desk
      isSharingScreen.value = true
      localVideoMuted.value = false
      desk.addEventListener?.(JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED, () => {
        if (isSharingScreen.value) void toggleScreenShare()
      })
      bumpTracks()
      syncParticipants()
    } catch (err) {
      pushToast({
        title: 'Tela',
        body: friendlyMediaError(err) || 'Não foi possível compartilhar a tela.',
        kind: 'info',
      })
    }
  }

  async function setNoiseSuppression(enabled) {
    noiseSuppression.value = !!enabled
    const track = getLocalTrack('audio')
    if (!track) return
    try {
      // 1) RNNoise / effect nativo quando disponível no build do Jitsi
      const NoiseEffect = JitsiMeetJS?.effects?.createNoiseSuppressionEffect
        || window?.createNoiseSuppressionEffect
      if (typeof track.setEffect === 'function' && typeof NoiseEffect === 'function') {
        await track.setEffect(enabled ? NoiseEffect() : undefined)
        return
      }

      // 2) Fallback: supressão nativa do navegador (getUserMedia constraints)
      const media = track.getTrack?.() || track.stream?.getAudioTracks?.()?.[0]
      if (media && typeof media.applyConstraints === 'function') {
        await media.applyConstraints({
          noiseSuppression: !!enabled,
          echoCancellation: true,
          autoGainControl: true,
        })
        const applied = media.getSettings?.()?.noiseSuppression
        if (enabled && applied === false) {
          throw new Error('Supressão de ruído não suportada por este microfone.')
        }
        return
      }

      if (enabled) {
        noiseSuppression.value = false
        pushToast({
          title: 'Áudio',
          body: 'Supressão de ruído não disponível neste navegador.',
          kind: 'info',
        })
      }
    } catch (err) {
      noiseSuppression.value = false
      pushToast({ title: 'Áudio', body: friendlyMediaError(err), kind: 'info' })
    }
  }

  async function toggleRecording() {
    if (!conference || status.value !== 'live' || role !== 'host') return
    try {
      if (isRecording.value) {
        if (typeof conference.stopRecording === 'function') {
          conference.stopRecording('file')
        }
        isRecording.value = false
        pushToast({ title: 'Gravação', body: 'Gravação encerrada.', kind: 'info' })
        return
      }
      if (typeof conference.startRecording !== 'function') {
        pushToast({
          title: 'Gravação',
          body: 'Gravação não disponível neste servidor Jitsi.',
          kind: 'info',
        })
        return
      }
      conference.startRecording({ mode: 'file', appData: JSON.stringify({ by: localDisplayName }) })
      pushToast({ title: 'Gravação', body: 'Iniciando gravação…', kind: 'info' })
    } catch (err) {
      isRecording.value = false
      pushToast({
        title: 'Gravação',
        body: friendlyMediaError(err) || 'Não foi possível gravar a consulta.',
        kind: 'error',
      })
    }
  }

  async function setBackground(mode, imageUrl = '') {
    const nextMode = mode || 'none'
    const track = getLocalTrack('video')
    if (!track || isSharingScreen.value) {
      backgroundMode.value = 'none'
      backgroundImageUrl.value = ''
      pushToast({
        title: 'Fundo',
        body: isSharingScreen.value
          ? 'Pare o compartilhamento de tela para usar efeitos.'
          : 'Ligue a câmera para aplicar o fundo.',
        kind: 'error',
      })
      return
    }
    if (typeof track.setEffect !== 'function') {
      backgroundMode.value = 'none'
      backgroundImageUrl.value = ''
      pushToast({
        title: 'Fundo',
        body: 'Efeito de fundo não disponível neste aparelho.',
        kind: 'error',
      })
      return
    }

    backgroundMode.value = nextMode
    backgroundImageUrl.value = nextMode.startsWith('image:') ? String(imageUrl || '') : ''

    try {
      if (nextMode !== 'none') {
        const engineReady = await preloadVirtualBackgroundEngine()
        if (!engineReady) {
          throw new Error('Motor de fundo virtual indisponível. Atualize o app e tente de novo.')
        }
      }

      if (nextMode === 'none') {
        await track.setEffect(undefined)
        reattachTrackElements(track)
        bumpTracks()
        return
      }

      pushToast({
        title: 'Fundo',
        body: 'Aplicando efeito…',
        kind: 'info',
      })

      // Remove efeito anterior antes de aplicar o novo (evita máscara “fantasma”)
      try { await track.setEffect(undefined) } catch { /* ignore */ }

      // Pipeline oficial Jitsi Meet V1 (TFLite landscape 256×144)
      // Meet: suave = 8px, forte = 25px
      const effect = nextMode.startsWith('image:') && backgroundImageUrl.value
        ? await createBackgroundBlurEffect({
            backgroundType: 'image',
            backgroundImageUrl: backgroundImageUrl.value,
          })
        : await createBackgroundBlurEffect({
            backgroundType: 'blur',
            blurValue: nextMode === 'soft' ? 8 : 25,
          })

      await track.setEffect(effect)
      reattachTrackElements(track)
      bumpTracks()
      pushToast({
        title: 'Fundo',
        body: nextMode.startsWith('image:')
          ? 'Plano de fundo aplicado.'
          : nextMode === 'soft'
            ? 'Desfoque suave ativado.'
            : 'Desfoque forte ativado.',
        kind: 'success',
      })
    } catch (err) {
      console.error('[jitsi-media] setBackground failed', err)
      backgroundMode.value = 'none'
      backgroundImageUrl.value = ''
      try { await track.setEffect(undefined) } catch { /* ignore */ }
      reattachTrackElements(track)
      bumpTracks()
      pushToast({
        title: 'Fundo',
        body: friendlyMediaError(err) || 'Não foi possível aplicar o efeito.',
        kind: 'error',
      })
    }
  }

  async function setLobbyEnabled(enabled) {
    if (!conference || role !== 'host') return
    try {
      if (enabled) {
        if (typeof conference.enableLobby === 'function') {
          await conference.enableLobby()
        } else {
          throw new Error('Sala de espera não suportada neste servidor.')
        }
      } else if (typeof conference.disableLobby === 'function') {
        await conference.disableLobby()
      }
      lobbyEnabled.value = !!enabled
      lobbySupported.value = true
      isModerator.value = !!conference.isModerator?.() || role === 'host'
      pushToast({
        title: 'Sala de espera',
        body: enabled ? 'Ativada. Você aprova quem entra.' : 'Desativada.',
        kind: 'success',
      })
    } catch (err) {
      lobbyEnabled.value = false
      pushToast({
        title: 'Sala de espera',
        body: friendlyMediaError(err) || 'Não foi possível alterar a sala de espera.',
        kind: 'info',
      })
    }
  }

  async function approveLobbyUser(id) {
    if (!conference || !id) return
    try {
      await conference.lobbyApproveAccess?.(id)
      onLobbyUserLeft(id)
    } catch (err) {
      pushToast({ title: 'Sala de espera', body: friendlyMediaError(err), kind: 'error' })
    }
  }

  async function denyLobbyUser(id) {
    if (!conference || !id) return
    try {
      await conference.lobbyDenyAccess?.(id)
      onLobbyUserLeft(id)
    } catch (err) {
      pushToast({ title: 'Sala de espera', body: friendlyMediaError(err), kind: 'error' })
    }
  }

  async function leave() {
    disposed = true
    status.value = 'left'

    // Nada aqui pode travar a saída — tudo com timeout
    const withTimeout = (p, ms = 1500) => Promise.race([
      Promise.resolve(p).catch(() => {}),
      new Promise((r) => setTimeout(r, ms)),
    ])

    if (desktopTrack) {
      await withTimeout(desktopTrack.dispose?.())
      desktopTrack = null
    }
    cameraTrackBackup = null
    isSharingScreen.value = false

    for (const track of localTracks) {
      try {
        // Efeito ativo (fundo/ruído) pode travar o dispose — remove antes
        if (typeof track.setEffect === 'function') {
          await withTimeout(track.setEffect(undefined), 800)
        }
        detachTrack(track)
        await withTimeout(track.dispose?.())
      } catch { /* ignore */ }
    }
    localTracks = []

    for (const bag of remoteTracks.values()) {
      if (bag.audio) detachTrack(bag.audio)
      if (bag.video) detachTrack(bag.video)
    }
    remoteTracks = new Map()

    if (conference) {
      const conf = conference
      conference = null
      try {
        await Promise.race([
          Promise.resolve(conf.leave?.()),
          new Promise((r) => setTimeout(r, 2500)),
        ])
      } catch { /* ignore */ }
    }
    if (connection) {
      const conn = connection
      connection = null
      try { conn.disconnect() } catch { /* ignore */ }
    }
    participants.value = []
    remoteHands = new Map()
    handRaised.value = false
    chatMessages.value = []
    unreadChat.value = 0
    chatOpen.value = false
    lobbyPending.value = []
    lobbyEnabled.value = false
    inLobby.value = false
    floatingReactions.value = []
    backgroundMode.value = 'none'
    backgroundImageUrl.value = ''
    noiseSuppression.value = false
    cameraFacing.value = 'user'
    speakerMuted.value = false
    isRecording.value = false
    audioInputDevices.value = []
    videoInputDevices.value = []
    audioOutputDevices.value = []
    selectedMicId.value = ''
    selectedCamId.value = ''
    selectedSpeakerId.value = ''
    audioOutputSupported.value = false
    if (deviceChangeHandler && typeof navigator !== 'undefined') {
      try { navigator.mediaDevices?.removeEventListener?.('devicechange', deviceChangeHandler) } catch { /* ignore */ }
      deviceChangeHandler = null
    }
    remoteAudioElements.clear()
    clearAudioLevels()
    toasts.value = []
    bumpTracks()
  }

  function getAudioLevel(participantId) {
    if (!participantId) return 0
    return audioLevels.value[participantId] || 0
  }

  function isSpeaking(participantId) {
    return getAudioLevel(participantId) >= SPEAKING_THRESHOLD
  }

  return {
    status,
    error,
    participants,
    localAudioMuted,
    localVideoMuted,
    handRaised,
    toasts,
    trackTick,
    mediaWarning,
    chatMessages,
    unreadChat,
    chatOpen,
    setChatOpen,
    sendChatMessage,
    isSharingScreen,
    noiseSuppression,
    isRecording,
    backgroundMode,
    backgroundImageUrl,
    lobbyEnabled,
    lobbySupported,
    isModerator,
    lobbyPending,
    floatingReactions,
    inLobby,
    cameraFacing,
    speakerMuted,
    audioLevels,
    getAudioLevel,
    isSpeaking,
    sendReaction,
    toggleScreenShare,
    toggleRecording,
    setNoiseSuppression,
    pushToast,
    setBackground,
    refreshMediaDevices,
    setMicrophone,
    setCamera,
    setSpeaker,
    playTestSound,
    getLocalMicLevel,
    audioInputDevices,
    videoInputDevices,
    audioOutputDevices,
    selectedMicId,
    selectedCamId,
    selectedSpeakerId,
    audioOutputSupported,
    setLobbyEnabled,
    approveLobbyUser,
    denyLobbyUser,
    join,
    leave,
    toggleAudio,
    toggleVideo,
    flipCamera,
    toggleSpeaker,
    toggleHand,
    dismissToast,
    getLocalTrack,
    getRemoteTrack,
    attachTrackToEl,
  }
}
