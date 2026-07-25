import { ref } from 'vue'

function micLabel(device, index) {
  const label = String(device?.label || '').trim()
  if (label) return label
  return index === 0 ? 'Microfone padrão' : `Microfone ${index + 1}`
}

export function useMicrophoneDevices() {
  const microphones = ref([])
  const selectedDeviceId = ref('')
  const permissionState = ref('prompt') // prompt | granted | denied | unsupported
  const permissionError = ref('')
  const loading = ref(false)

  let permissionStatus = null

  async function refreshDevices() {
    if (!navigator?.mediaDevices?.enumerateDevices) return
    const devices = await navigator.mediaDevices.enumerateDevices()
    microphones.value = devices.filter((d) => d.kind === 'audioinput')
    const stillValid = microphones.value.some((d) => d.deviceId === selectedDeviceId.value)
    if (!stillValid) {
      selectedDeviceId.value = microphones.value[0]?.deviceId || ''
    }
  }

  async function syncPermissionState() {
    if (!navigator?.mediaDevices?.getUserMedia) {
      permissionState.value = 'unsupported'
      permissionError.value = 'Seu navegador não suporta gravação de áudio.'
      return
    }

    if (navigator.permissions?.query) {
      try {
        permissionStatus = await navigator.permissions.query({ name: 'microphone' })
        permissionState.value = permissionStatus.state
        permissionStatus.onchange = () => {
          permissionState.value = permissionStatus.state
          if (permissionStatus.state === 'granted') void refreshDevices()
        }
        if (permissionStatus.state === 'granted') await refreshDevices()
        return
      } catch {
        /* Permissions API indisponível — segue com enumerateDevices */
      }
    }

    await refreshDevices()
    const hasLabels = microphones.value.some((d) => Boolean(d.label))
    permissionState.value = hasLabels ? 'granted' : 'prompt'
  }

  async function init() {
    permissionError.value = ''
    loading.value = true
    try {
      await syncPermissionState()
    } finally {
      loading.value = false
    }
  }

  async function requestPermission() {
    permissionError.value = ''

    if (!navigator?.mediaDevices?.getUserMedia) {
      permissionState.value = 'unsupported'
      permissionError.value = 'Seu navegador não suporta gravação de áudio.'
      return false
    }

    loading.value = true

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      stream.getTracks().forEach((track) => {
        try { track.stop() } catch { /* ignore */ }
      })
      permissionState.value = 'granted'
      permissionError.value = ''
      await refreshDevices()
      return true
    } catch (err) {
      const name = String(err?.name || '')
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        permissionState.value = 'denied'
        permissionError.value = 'Microfone bloqueado. Clique no cadeado ao lado da URL do site, permita o microfone e tente novamente.'
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        permissionState.value = 'denied'
        permissionError.value = 'Nenhum microfone foi encontrado neste dispositivo.'
      } else {
        permissionState.value = 'denied'
        permissionError.value = 'Não foi possível acessar o microfone.'
      }
      return false
    } finally {
      loading.value = false
    }
  }

  function buildAudioConstraints(deviceId) {
    const base = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    }
    if (deviceId) {
      return { audio: { ...base, deviceId: { ideal: deviceId } } }
    }
    return { audio: base }
  }

  function describeDevice(device, index) {
    return micLabel(device, index)
  }

  return {
    microphones,
    selectedDeviceId,
    permissionState,
    permissionError,
    loading,
    init,
    refreshDevices,
    requestPermission,
    buildAudioConstraints,
    describeDevice,
  }
}

export function pickRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  for (const mime of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime
    } catch {
      /* ignore */
    }
  }
  return ''
}

export function micPermissionErrorMessage(err) {
  const name = String(err?.name || '')
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Permita o microfone para gravar a anamnese.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Nenhum microfone foi encontrado neste dispositivo.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'O microfone está em uso por outro aplicativo.'
  }
  return 'Não foi possível iniciar a gravação.'
}
