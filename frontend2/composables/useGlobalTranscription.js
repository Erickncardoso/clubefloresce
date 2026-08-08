import { authFetchInit } from '~/composables/useAuthSession.js'
import { resolveUploadApiUrl } from '~/utils/resolve-api-base.mjs'
import { downloadBlob, downloadTextFile } from '~/utils/download-blob.js'
import { notifyTranscriptionReady } from '~/utils/transcription-notify.js'
import {
  ensureNutriPusherConnected,
  subscribeAnamneseTranscription,
} from '~/composables/useNutriPusher.js'

const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 120
const DISMISS_COMPLETED_MS = 12000

/** Blobs ficam fora do useState — não são serializáveis no SSR. */
const transcriptionBlobStore = new Map()
const pusherWaiters = new Map()

let pusherUnsub = null

function createJobId() {
  return `transcribe-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function ensurePusherBridge() {
  if (!import.meta.client || pusherUnsub) return
  void ensureNutriPusherConnected()
  pusherUnsub = subscribeAnamneseTranscription((payload) => {
    const backendJobId = String(payload?.jobId || '')
    if (!backendJobId) return

    const waiter = pusherWaiters.get(backendJobId)
    if (!waiter) return

    if (payload.status === 'completed') {
      waiter.resolve({
        text: String(payload.text || '').trim(),
        status: 'completed',
      })
    } else if (payload.status === 'error') {
      waiter.reject(new Error(String(payload.error || 'Falha ao transcrever o áudio.')))
    }
  })
}

async function pollTranscriptionJob({ patientId, backendJobId, apiBase, onStatus }) {
  const url = resolveUploadApiUrl(
    `/patients/${patientId}/anamnese/transcribe/${backendJobId}`,
    apiBase,
  )

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    onStatus?.('processing', attempt)
    const data = await $fetch(url, authFetchInit())
    if (data?.status === 'completed') {
      const text = String(data.text || '').trim()
      if (!text) throw new Error('Transcrição vazia.')
      return { text, status: 'completed' }
    }
    if (data?.status === 'error') {
      throw new Error(String(data.error || 'Falha ao transcrever o áudio.'))
    }
    await sleep(POLL_INTERVAL_MS)
  }

  throw new Error('A transcrição demorou demais. Baixe o áudio e tente novamente.')
}

async function waitForJobCompletion({ patientId, backendJobId, apiBase, onStatus }) {
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (fn, value) => {
      if (settled) return
      settled = true
      pusherWaiters.delete(backendJobId)
      fn(value)
    }

    pusherWaiters.set(backendJobId, {
      resolve: (value) => finish(resolve, value),
      reject: (error) => finish(reject, error),
    })

    void (async () => {
      try {
        const polled = await pollTranscriptionJob({ patientId, backendJobId, apiBase, onStatus })
        finish(resolve, polled)
      } catch (error) {
        finish(reject, error)
      }
    })()
  })
}

async function runTranscriptionJob({ patientId, formData, apiBase, onStatus }) {
  ensurePusherBridge()

  const submitUrl = resolveUploadApiUrl(`/patients/${patientId}/anamnese/transcribe`, apiBase)
  const queued = await $fetch(submitUrl, authFetchInit({
    method: 'POST',
    body: formData,
    timeout: 120_000,
  }))

  const backendJobId = String(queued?.jobId || '').trim()
  if (!backendJobId) {
    throw new Error('Resposta inválida ao enfileirar a transcrição.')
  }

  onStatus?.('processing', 0)
  const result = await waitForJobCompletion({ patientId, backendJobId, apiBase, onStatus })
  return { ...result, backendJobId }
}

export function useGlobalTranscription() {
  const jobs = useState('global-transcription-jobs', () => [])
  const removeTimers = useState('global-transcription-remove-timers', () => ({}))

  function updateJob(id, patch) {
    jobs.value = jobs.value.map((job) => (job.id === id ? { ...job, ...patch } : job))
  }

  function removeJob(id) {
    transcriptionBlobStore.delete(id)
    jobs.value = jobs.value.filter((item) => item.id !== id)
    const timers = removeTimers.value
    if (timers[id]) {
      clearTimeout(timers[id])
      delete timers[id]
    }
  }

  function dismissJob(id) {
    removeJob(id)
  }

  function scheduleRemoveJob(id, delay = DISMISS_COMPLETED_MS) {
    const timers = removeTimers.value
    if (timers[id]) clearTimeout(timers[id])
    timers[id] = setTimeout(() => {
      removeJob(id)
      delete timers[id]
    }, delay)
  }

  function isPatientTranscribing(patientId) {
    const pid = String(patientId || '').trim()
    if (!pid) return false
    return jobs.value.some((job) =>
      job.patientId === pid && (job.status === 'processing' || job.status === 'reconnecting' || job.status === 'queued'),
    )
  }

  function consumePendingForPatient(patientId) {
    const pid = String(patientId || '').trim()
    if (!pid) return null
    const job = jobs.value.find((item) =>
      item.patientId === pid && item.status === 'completed' && item.text && !item.consumed,
    )
    if (!job) return null
    updateJob(job.id, { consumed: true })
    scheduleRemoveJob(job.id, 2500)
    return { id: job.id, text: job.text, patientName: job.patientName }
  }

  function notifyJobComplete(job, text) {
    const patient = job.patientName ? ` · ${job.patientName}` : ''
    notifyTranscriptionReady({
      title: 'Transcrição pronta',
      body: `A consulta foi transcrita${patient}. Revise antes de salvar.`,
      tag: `transcription-${job.id}`,
    })
  }

  function notifyJobError(job, message) {
    notifyTranscriptionReady({
      title: 'Erro na transcrição',
      body: `${message} Baixe o áudio — sua gravação está preservada.`,
      tag: `transcription-error-${job.id}`,
    })
  }

  function enqueueTranscription({
    patientId,
    patientName = '',
    anamneseTitle = '',
    blob,
    filename = 'anamnese.webm',
    apiBase,
    onSuccess = null,
  }) {
    if (!patientId || !blob?.size) {
      throw new Error('Áudio inválido para transcrição.')
    }

    ensurePusherBridge()

    const id = createJobId()
    const label = patientName
      ? `Transcrição · ${patientName}`
      : 'Transcrição de anamnese'
    const formData = new FormData()
    formData.append('audio', blob, filename)
    if (anamneseTitle) formData.append('anamneseTitle', anamneseTitle)

    const job = {
      id,
      backendJobId: null,
      patientId: String(patientId),
      patientName: String(patientName || '').trim(),
      anamneseTitle: String(anamneseTitle || '').trim(),
      fileName: filename,
      label,
      status: 'queued',
      retryCount: 0,
      text: null,
      error: null,
      consumed: false,
      hasAudio: true,
      createdAt: Date.now(),
      completedAt: null,
    }

    transcriptionBlobStore.set(id, {
      blob,
      apiBase,
      onSuccess: typeof onSuccess === 'function' ? onSuccess : null,
    })
    jobs.value = [...jobs.value, job]

    const promise = runTranscriptionJob({
      patientId: job.patientId,
      formData,
      apiBase,
      onStatus: (status, retryCount) => {
        updateJob(id, { status, retryCount })
      },
    })
      .then((data) => {
        const text = String(data?.text || '').trim()
        if (!text) throw new Error('Transcrição vazia.')
        const stored = transcriptionBlobStore.get(id)
        updateJob(id, {
          status: 'completed',
          text,
          error: null,
          backendJobId: data.backendJobId || null,
          completedAt: Date.now(),
        })
        try {
          stored?.onSuccess?.(text)
        } catch {
          /* handler may detach when modal closes */
        }
        notifyJobComplete(job, text)
        scheduleRemoveJob(id)
        return text
      })
      .catch((err) => {
        const message = err?.data?.message || err?.message || 'Falha ao transcrever o áudio.'
        updateJob(id, {
          status: 'error',
          error: message,
          hasAudio: Boolean(transcriptionBlobStore.get(id)?.blob),
        })
        notifyJobError(job, message)
        /* Erro: blob preservado localmente para download/retry */
      })

    updateJob(id, { promise, status: 'processing' })
    return { id, promise }
  }

  async function retryJob(id) {
    const stored = transcriptionBlobStore.get(id)
    const job = jobs.value.find((item) => item.id === id)
    if (!stored?.blob || !stored?.apiBase || !job) return null
    updateJob(id, { status: 'processing', error: null, retryCount: 0, hasAudio: true })

    const formData = new FormData()
    formData.append('audio', stored.blob, job.fileName || 'anamnese.webm')
    if (job.anamneseTitle) formData.append('anamneseTitle', job.anamneseTitle)

    try {
      const data = await runTranscriptionJob({
        patientId: job.patientId,
        formData,
        apiBase: stored.apiBase,
        onStatus: (status, retryCount) => updateJob(id, { status, retryCount }),
      })
      const text = String(data?.text || '').trim()
      if (!text) throw new Error('Transcrição vazia.')
      updateJob(id, {
        status: 'completed',
        text,
        completedAt: Date.now(),
        error: null,
        backendJobId: data.backendJobId || null,
      })
      transcriptionBlobStore.get(id)?.onSuccess?.(text)
      notifyJobComplete(job, text)
      scheduleRemoveJob(id)
      return text
    } catch (err) {
      const message = err?.data?.message || err?.message || 'Falha ao transcrever o áudio.'
      updateJob(id, { status: 'error', error: message, hasAudio: true })
      notifyJobError(job, message)
      throw err
    }
  }

  const activeJobs = computed(() => jobs.value)

  const visibleJobs = computed(() =>
    jobs.value.filter((job) => job.status !== 'completed' || !job.consumed),
  )

  function hasJobAudio(id) {
    return Boolean(transcriptionBlobStore.get(id)?.blob)
  }

  function downloadJobAudio(id) {
    const stored = transcriptionBlobStore.get(id)
    const job = jobs.value.find((item) => item.id === id)
    if (!stored?.blob) return false
    downloadBlob(stored.blob, job?.fileName || 'anamnese.webm')
    return true
  }

  function downloadJobTranscript(id) {
    const job = jobs.value.find((item) => item.id === id)
    if (!job?.text) return false
    const base = String(job.anamneseTitle || job.patientName || 'transcricao')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'transcricao'
    downloadTextFile(job.text, `${base}.txt`)
    return true
  }

  return {
    jobs: activeJobs,
    visibleJobs,
    enqueueTranscription,
    dismissJob,
    retryJob,
    isPatientTranscribing,
    consumePendingForPatient,
    downloadJobAudio,
    downloadJobTranscript,
    hasJobAudio,
  }
}
