import { uploadVideoToCloudinaryWithRetry } from '~/utils/cloudinary-video-upload'
import { isCloudinarySizeError, needsServerCompression } from '~/utils/video-upload-limits'
import { normalizeUploadError } from '~/utils/resolve-api-base.mjs'
import { resolveVideoUploadEndpoint } from '~/utils/video-upload-endpoint'
import { captureVideoThumbnail, revokeThumbnailUrl } from '~/utils/video-thumbnail'

function createJobId() {
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function parseUploadErrorMessage(xhr, fallback = 'Erro no upload do vídeo.') {
  try {
    const data = JSON.parse(xhr?.responseText || '{}')
    return normalizeUploadError({ message: data?.error?.message || data?.message || fallback })
  } catch {
    return fallback
  }
}

function shouldUseBackendFallback(error) {
  const message = String(error?.message || '')
  return /cloudinary não configurado|não foi possível preparar|503|assinatura/i.test(message)
}

function uploadVideoThroughBackend(file, apiBase, onProgress) {
  const token = localStorage.getItem('auth_token')
  const uploadUrl = resolveVideoUploadEndpoint(apiBase)

  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', uploadUrl)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.timeout = 1000 * 60 * 60

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || !onProgress) return
      const percent = Math.round((event.loaded / event.total) * 100)
      onProgress(Math.min(percent, 99), percent >= 100 ? 'processing' : 'uploading')
    })

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText || '{}')
          const url = data?.url
          if (!url) {
            reject(new Error('Upload concluído sem URL do vídeo.'))
            return
          }
          resolve({ url, compressed: data?.compressed, originalSizeMB: data?.originalSizeMB, sizeMB: data?.sizeMB })
          return
        } catch {
          reject(new Error('Resposta inválida do servidor.'))
          return
        }
      }
      reject(new Error(parseUploadErrorMessage(xhr, `Erro no upload (${xhr.status || 'rede'}).`)))
    }

    xhr.onerror = () => {
      reject(new Error(
        'Falha ao enviar o vídeo ao servidor. Confira se o backend está rodando (porta 3001) e tente novamente.',
      ))
    }
    xhr.ontimeout = () => reject(new Error('Upload excedeu o tempo limite. Aguarde e tente novamente.'))
    xhr.send(formData)
  })
}

async function runVideoUpload(file, apiBase, onProgress) {
  const token = localStorage.getItem('auth_token')
  const useServer = needsServerCompression(file)

  if (useServer) {
    onProgress?.(0, 'uploading')
    try {
      return await uploadVideoThroughBackend(file, apiBase, onProgress)
    } catch (backendError) {
      throw new Error(normalizeUploadError(backendError))
    }
  }

  try {
    const url = await uploadVideoToCloudinaryWithRetry(file, apiBase, token, onProgress)
    return { url, compressed: false }
  } catch (directError) {
    if (isCloudinarySizeError(directError) || shouldUseBackendFallback(directError)) {
      console.warn('[upload] envio direto falhou, comprimindo no servidor', directError)
      onProgress?.(0, 'uploading')
      try {
        return await uploadVideoThroughBackend(file, apiBase, onProgress)
      } catch (backendError) {
        throw new Error(normalizeUploadError(backendError))
      }
    }

    throw new Error(normalizeUploadError(directError))
  }
}

export function useVideoUploadQueue() {
  const jobs = useState('video-upload-jobs', () => [])
  const removeTimers = useState('video-upload-remove-timers', () => ({}))

  function updateJob(id, patch) {
    jobs.value = jobs.value.map((job) => (
      job.id === id ? { ...job, ...patch } : job
    ))
  }

  function removeJob(id) {
    const job = jobs.value.find((item) => item.id === id)
    if (job?.thumbnailUrl) revokeThumbnailUrl(job.thumbnailUrl)
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

  function scheduleRemoveJob(id, delay = 2200) {
    const timers = removeTimers.value
    if (timers[id]) clearTimeout(timers[id])
    timers[id] = setTimeout(() => {
      removeJob(id)
      delete timers[id]
    }, delay)
  }

  function enqueueVideoUpload({ file, label, apiBase, persistAfterUpload = false, previewUrl = null }) {
    const id = createJobId()
    const job = {
      id,
      fileName: file.name,
      label: label || file.name,
      progress: 0,
      status: 'uploading',
      videoUrl: null,
      error: null,
      thumbnailUrl: previewUrl || null,
      createdAt: Date.now(),
      promise: null,
      compressing: needsServerCompression(file),
    }

    jobs.value = [...jobs.value, job]

    if (!previewUrl && import.meta.client) {
      captureVideoThumbnail(file).then((thumbUrl) => {
        if (thumbUrl) updateJob(id, { thumbnailUrl: thumbUrl })
      })
    }

    const onProgress = (progress, status) => {
      updateJob(id, { progress, status })
    }

    const promise = runVideoUpload(file, apiBase, onProgress)
      .then((result) => {
        updateJob(id, {
          progress: 100,
          status: persistAfterUpload ? 'uploaded' : 'done',
          videoUrl: result.url,
        })
        if (!persistAfterUpload) scheduleRemoveJob(id)
        return result.url
      })
      .catch((error) => {
        const message = normalizeUploadError(error)
        updateJob(id, { status: 'error', error: message })
        throw new Error(message)
      })

    updateJob(id, { promise })
    return { id, promise }
  }

  function markJobSaving(id, label = 'Salvando aula…') {
    updateJob(id, { status: 'saving', label })
  }

  function completeUploadJob(id, { label = 'Aula criada' } = {}) {
    updateJob(id, { status: 'done', label, progress: 100 })
    scheduleRemoveJob(id)
  }

  function failUploadJob(id, error, label) {
    updateJob(id, {
      status: 'error',
      error: normalizeUploadError({ message: error }),
      label: label || undefined,
    })
  }

  const activeJobs = computed(() => jobs.value)

  return {
    jobs: activeJobs,
    enqueueVideoUpload,
    dismissJob,
    removeJob,
    markJobSaving,
    completeUploadJob,
    failUploadJob,
  }
}
