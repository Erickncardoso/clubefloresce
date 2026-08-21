'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { API_BASE, ApiError } from '@/lib/api'

type Options = {
  patientId: string
  /** Frases finais enquanto fala (texto corrido, sem papel). */
  onTranscript: (text: string) => void
  onInterim?: (text: string) => void
  onError?: (message: string) => void
  chunkMs?: number
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null
  onerror: ((ev: { error?: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0: { transcript: string }
  }>
}

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionLike)
  | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ]
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return ''
}

async function recordChunk(
  stream: MediaStream,
  mimeType: string,
  durationMs: number,
  signal: AbortSignal,
): Promise<Blob | null> {
  if (signal.aborted) return null
  const chunks: BlobPart[] = []
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const done = new Promise<Blob | null>((resolve) => {
    recorder.ondataavailable = (e) => {
      if (e.data?.size) chunks.push(e.data)
    }
    recorder.onerror = () => resolve(null)
    recorder.onstop = () => {
      if (!chunks.length) {
        resolve(null)
        return
      }
      resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' }))
    }
  })
  recorder.start()
  await new Promise<void>((resolve) => {
    const timer = window.setTimeout(() => resolve(), durationMs)
    const onAbort = () => {
      window.clearTimeout(timer)
      resolve()
    }
    if (signal.aborted) {
      onAbort()
      return
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
  if (recorder.state !== 'inactive') {
    try {
      recorder.stop()
    } catch {
      /* ignore */
    }
  }
  return done
}

async function uploadChunk(patientId: string, blob: Blob): Promise<string> {
  const form = new FormData()
  const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm'
  form.append('audio', blob, `live.${ext}`)
  const res = await fetch(
    `${API_BASE}/patients/${encodeURIComponent(patientId)}/anamnese/transcribe-live`,
    { method: 'POST', body: form, credentials: 'include' },
  )
  const text = await res.text()
  let data: { text?: string; message?: string } | null = null
  try {
    data = text ? (JSON.parse(text) as { text?: string; message?: string }) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    throw new ApiError(data?.message || `Erro HTTP ${res.status}`, res.status, data)
  }
  return String(data?.text || '').trim()
}

const WAVE_BARS = 14
export const DICTATION_MAX_SECONDS = 30 * 60

export function useAnamneseLiveDictation({
  patientId,
  onTranscript,
  onInterim,
  onError,
  chunkMs = 2800,
}: Options) {
  const [listening, setListening] = useState(false)
  const [paused, setPaused] = useState(false)
  const [busy, setBusy] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: WAVE_BARS }, () => 0.15))

  const listeningRef = useRef(false)
  const pausedRef = useRef(false)
  const loopAbortRef = useRef<AbortController | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const onTranscriptRef = useRef(onTranscript)
  const onInterimRef = useRef(onInterim)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])
  useEffect(() => {
    onInterimRef.current = onInterim
  }, [onInterim])
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  const stopMeter = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    analyserRef.current = null
    const ctx = audioCtxRef.current
    audioCtxRef.current = null
    if (ctx) void ctx.close().catch(() => undefined)
    setLevels(Array.from({ length: WAVE_BARS }, () => 0.15))
  }, [])

  const startMeter = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.72
      source.connect(analyser)
      audioCtxRef.current = ctx
      analyserRef.current = analyser
      const data = new Uint8Array(analyser.frequencyBinCount)

      const tick = () => {
        const node = analyserRef.current
        if (!node || !listeningRef.current) return
        if (pausedRef.current) {
          setLevels(Array.from({ length: WAVE_BARS }, () => 0.12))
          rafRef.current = requestAnimationFrame(tick)
          return
        }
        node.getByteFrequencyData(data)
        const next: number[] = []
        const step = Math.floor(data.length / WAVE_BARS)
        for (let i = 0; i < WAVE_BARS; i += 1) {
          let sum = 0
          const start = i * step
          for (let j = start; j < start + step; j += 1) sum += data[j] || 0
          const avg = sum / Math.max(1, step) / 255
          next.push(Math.max(0.12, Math.min(1, avg * 1.55)))
        }
        setLevels(next)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      /* ignore */
    }
  }, [])

  const stop = useCallback(() => {
    listeningRef.current = false
    pausedRef.current = false
    setListening(false)
    setPaused(false)
    setBusy(false)
    setElapsedSec(0)
    onInterimRef.current?.('')
    loopAbortRef.current?.abort()
    loopAbortRef.current = null
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (recognition) {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      try {
        recognition.abort()
      } catch {
        try {
          recognition.stop()
        } catch {
          /* ignore */
        }
      }
    }
    stopMeter()
    const stream = streamRef.current
    streamRef.current = null
    stream?.getTracks().forEach((t) => t.stop())
  }, [stopMeter])

  const pause = useCallback(() => {
    if (!listeningRef.current || pausedRef.current) return
    pausedRef.current = true
    setPaused(true)
    onInterimRef.current?.('')
    const recognition = recognitionRef.current
    if (recognition) {
      try {
        recognition.stop()
      } catch {
        /* ignore */
      }
    }
  }, [])

  const resume = useCallback(() => {
    if (!listeningRef.current || !pausedRef.current) return
    pausedRef.current = false
    setPaused(false)
    const recognition = recognitionRef.current
    if (recognition) {
      try {
        recognition.start()
      } catch {
        /* ignore */
      }
    }
  }, [])

  const startWhisperLoop = useCallback(
    async (stream: MediaStream) => {
      const mimeType = pickMimeType()
      const abort = new AbortController()
      loopAbortRef.current = abort
      while (listeningRef.current && !abort.signal.aborted) {
        if (pausedRef.current) {
          await new Promise((r) => setTimeout(r, 250))
          continue
        }
        const blob = await recordChunk(stream, mimeType, chunkMs, abort.signal)
        if (!listeningRef.current || abort.signal.aborted) break
        if (pausedRef.current) continue
        if (!blob || blob.size < 1200) continue
        setBusy(true)
        try {
          const text = await uploadChunk(patientId, blob)
          if (text) onTranscriptRef.current(text)
        } catch (err: unknown) {
          const msg =
            err instanceof ApiError
              ? err.message
              : (err as { message?: string })?.message || 'Falha ao transcrever o áudio.'
          onErrorRef.current?.(msg)
        } finally {
          setBusy(false)
        }
      }
    },
    [chunkMs, patientId],
  )

  const startSpeechRecognition = useCallback(
    (stream: MediaStream) => {
      const Ctor = getSpeechRecognitionCtor()
      if (!Ctor) return false

      const recognition = new Ctor()
      recognition.lang = 'pt-BR'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1
      recognitionRef.current = recognition

      recognition.onresult = (event) => {
        let interim = ''
        let finals = ''
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i]
          const piece = String(result?.[0]?.transcript || '').trim()
          if (!piece) continue
          if (result.isFinal) finals = finals ? `${finals} ${piece}` : piece
          else interim = interim ? `${interim} ${piece}` : piece
        }
        onInterimRef.current?.(interim)
        if (finals) {
          onTranscriptRef.current(finals)
          onInterimRef.current?.('')
        }
      }

      recognition.onerror = (ev) => {
        const code = String(ev?.error || '')
        if (code === 'aborted' || code === 'no-speech') return
        if (code === 'not-allowed') {
          onErrorRef.current?.('Permita o microfone para ditar a anamnese.')
          stop()
          return
        }
        if (listeningRef.current && streamRef.current) {
          try {
            recognition.abort()
          } catch {
            /* ignore */
          }
          recognitionRef.current = null
          void startWhisperLoop(stream)
        }
      }

      recognition.onend = () => {
        if (!listeningRef.current || pausedRef.current) return
        try {
          recognition.start()
        } catch {
          /* ignore */
        }
      }

      try {
        recognition.start()
        return true
      } catch {
        return false
      }
    },
    [startWhisperLoop, stop],
  )

  const start = useCallback(async () => {
    if (listeningRef.current) return
    if (typeof window === 'undefined') return
    if (!patientId) {
      onErrorRef.current?.('Paciente inválido para ditado.')
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      })
    } catch {
      onErrorRef.current?.('Permita o microfone para ditar a anamnese.')
      return
    }

    streamRef.current = stream
    listeningRef.current = true
    pausedRef.current = false
    setListening(true)
    setPaused(false)
    setElapsedSec(0)
    setBusy(false)
    startMeter(stream)

    const usedSpeech = startSpeechRecognition(stream)
    if (!usedSpeech) {
      if (typeof MediaRecorder === 'undefined') {
        onErrorRef.current?.('Seu navegador não suporte ditado por voz.')
        stop()
        return
      }
      void startWhisperLoop(stream)
    }
  }, [patientId, startMeter, startSpeechRecognition, startWhisperLoop, stop])

  const toggle = useCallback(() => {
    if (listeningRef.current) stop()
    else void start()
  }, [start, stop])

  useEffect(() => {
    if (!listening || paused) return
    const id = window.setInterval(() => {
      setElapsedSec((sec) => sec + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [listening, paused])

  useEffect(() => () => stop(), [stop])

  return {
    listening,
    paused,
    busy,
    levels,
    elapsedSec,
    start,
    stop,
    pause,
    resume,
    toggle,
  }
}
