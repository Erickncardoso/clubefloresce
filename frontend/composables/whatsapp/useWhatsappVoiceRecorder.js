import { ref, computed, onUnmounted } from 'vue'

const pickRecorderMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'audio/ogg;codecs=opus',
    'audio/webm;codecs=opus',
    'audio/webm',
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

const formatDuration = (totalSeconds) => {
  const secs = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const minutes = Math.floor(secs / 60)
  const rest = secs % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

export function useWhatsappVoiceRecorder() {
  const isRecording = ref(false)
  const isPaused = ref(false)
  const durationSeconds = ref(0)
  const waveformLevels = ref(Array.from({ length: 36 }, () => 0.18))
  const errorMessage = ref('')

  let mediaStream = null
  let mediaRecorder = null
  let chunks = []
  let durationTimer = null
  let waveformTimer = null
  let audioContext = null
  let analyser = null
  let startedAt = 0
  let pausedAccumMs = 0
  let pauseStartedAt = 0

  const cleanupStream = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => {
        try { track.stop() } catch { /* ignore */ }
      })
    }
    mediaStream = null
  }

  const cleanupAudioGraph = () => {
    if (audioContext) {
      try { audioContext.close() } catch { /* ignore */ }
    }
    audioContext = null
    analyser = null
  }

  const stopTimers = () => {
    if (durationTimer) clearInterval(durationTimer)
    if (waveformTimer) clearInterval(waveformTimer)
    durationTimer = null
    waveformTimer = null
  }

  const resetState = () => {
    stopTimers()
    cleanupStream()
    cleanupAudioGraph()
    mediaRecorder = null
    chunks = []
    isRecording.value = false
    isPaused.value = false
    durationSeconds.value = 0
    waveformLevels.value = Array.from({ length: 36 }, () => 0.18)
    startedAt = 0
    pausedAccumMs = 0
    pauseStartedAt = 0
  }

  const updateDuration = () => {
    if (!startedAt) return
    let elapsed = Date.now() - startedAt - pausedAccumMs
    if (isPaused.value && pauseStartedAt) {
      elapsed -= Date.now() - pauseStartedAt
    }
    durationSeconds.value = Math.max(0, Math.floor(elapsed / 1000))
  }

  const startWaveformLoop = () => {
    waveformTimer = setInterval(() => {
      if (!analyser || isPaused.value) return
      const buffer = new Uint8Array(analyser.fftSize)
      analyser.getByteTimeDomainData(buffer)
      let sum = 0
      for (let i = 0; i < buffer.length; i += 1) {
        const v = (buffer[i] - 128) / 128
        sum += Math.abs(v)
      }
      const avg = sum / buffer.length
      const level = Math.min(1, Math.max(0.12, avg * 2.4))
      const next = waveformLevels.value.slice(1)
      next.push(level)
      waveformLevels.value = next
    }, 90)
  }

  const startRecording = async () => {
    errorMessage.value = ''
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      errorMessage.value = 'Gravação indisponível neste ambiente.'
      return false
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      errorMessage.value = 'Seu navegador não suporta gravação de áudio.'
      return false
    }
    if (typeof MediaRecorder === 'undefined') {
      errorMessage.value = 'Seu navegador não suporta MediaRecorder.'
      return false
    }

    resetState()

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch (error) {
      const name = String(error?.name || '')
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        errorMessage.value = 'Permita o microfone para gravar mensagens de voz.'
      } else {
        errorMessage.value = 'Não foi possível acessar o microfone.'
      }
      resetState()
      return false
    }

    const mimeType = pickRecorderMimeType()
    if (!mimeType) {
      errorMessage.value = 'Formato de áudio não suportado neste navegador.'
      resetState()
      return false
    }

    try {
      mediaRecorder = new MediaRecorder(mediaStream, { mimeType })
    } catch {
      errorMessage.value = 'Não foi possível iniciar a gravação.'
      resetState()
      return false
    }

    chunks = []
    mediaRecorder.ondataavailable = (event) => {
      if (event?.data && event.data.size > 0) chunks.push(event.data)
    }

    try {
      audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(mediaStream)
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
    } catch {
      analyser = null
    }

    mediaRecorder.start(200)
    startedAt = Date.now()
    isRecording.value = true
    isPaused.value = false
    durationSeconds.value = 0
    durationTimer = setInterval(updateDuration, 250)
    startWaveformLoop()
    return true
  }

  const togglePause = () => {
    if (!mediaRecorder || !isRecording.value) return
    if (isPaused.value) {
      isPaused.value = false
      if (pauseStartedAt) {
        pausedAccumMs += Date.now() - pauseStartedAt
        pauseStartedAt = 0
      }
      try { mediaRecorder.resume() } catch { /* ignore */ }
      return
    }
    isPaused.value = true
    pauseStartedAt = Date.now()
    try { mediaRecorder.pause() } catch { /* ignore */ }
  }

  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.onstop = null
      try { mediaRecorder.stop() } catch { /* ignore */ }
    }
    resetState()
  }

  const finishRecording = () => new Promise((resolve) => {
    if (!mediaRecorder || !isRecording.value) {
      resolve(null)
      return
    }

    const mimeType = mediaRecorder.mimeType || pickRecorderMimeType() || 'audio/webm'
    const finalDuration = Math.max(1, durationSeconds.value)

    mediaRecorder.onstop = () => {
      const blob = chunks.length
        ? new Blob(chunks, { type: mimeType })
        : null
      resetState()
      if (!blob || blob.size < 32) {
        resolve(null)
        return
      }
      resolve({ blob, durationSeconds: finalDuration, mimeType: blob.type || mimeType })
    }

    try {
      mediaRecorder.stop()
    } catch {
      resetState()
      resolve(null)
    }
  })

  onUnmounted(() => {
    cancelRecording()
  })

  return {
    isRecording,
    isPaused,
    durationSeconds,
    waveformLevels,
    errorMessage,
    durationLabel: computed(() => formatDuration(durationSeconds.value)),
    startRecording,
    togglePause,
    cancelRecording,
    finishRecording,
  }
}
