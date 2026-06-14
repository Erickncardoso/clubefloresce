const MB = 1024 * 1024
/** Acima disso usa upload em partes direto no Cloudinary. */
const CHUNK_THRESHOLD = 50 * MB
const CHUNK_SIZE = 10 * MB
const MAX_ATTEMPTS = 3

function parseUploadError(xhr, fallback = 'Erro no upload do vídeo.') {
  try {
    const data = JSON.parse(xhr?.responseText || '{}')
    return data?.error?.message || data?.message || fallback
  } catch {
    return fallback
  }
}

function generateUniqueUploadId() {
  return `clube-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchVideoUploadSignature(apiBase, token) {
  const { resolveUploadApiUrl } = await import('./resolve-api-base.mjs')
  const url = resolveUploadApiUrl('/upload/video/signature', apiBase)

  let lastError = null
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!response.ok) {
        let message = 'Não foi possível preparar o envio do vídeo.'
        try {
          const data = await response.json()
          message = data?.message || message
        } catch {
          /* ignore */
        }
        throw new Error(message)
      }

      const data = await response.json()
      if (!data?.uploadUrl || !data?.signature) {
        throw new Error('Resposta inválida ao preparar upload.')
      }
      return data
    } catch (error) {
      lastError = error
      if (attempt < MAX_ATTEMPTS) await wait(800 * attempt)
    }
  }

  throw lastError || new Error('Não foi possível preparar o envio do vídeo.')
}

function uploadSimple(file, signature, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('api_key', signature.apiKey)
    formData.append('timestamp', String(signature.timestamp))
    formData.append('signature', signature.signature)
    formData.append('folder', signature.folder)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', signature.uploadUrl)
    xhr.timeout = 60 * 60 * 1000

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || !onProgress) return
      const percent = Math.round((event.loaded / event.total) * 100)
      onProgress(Math.min(percent, 99), 'uploading')
    })

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText || '{}')
          if (!data?.secure_url) {
            reject(new Error('Upload concluído sem URL do vídeo.'))
            return
          }
          if (onProgress) onProgress(100, 'uploading')
          resolve(data.secure_url)
          return
        } catch {
          reject(new Error('Resposta inválida do Cloudinary.'))
          return
        }
      }
      reject(new Error(parseUploadError(xhr, `Erro no upload (${xhr.status || 'rede'}).`)))
    }

    xhr.onerror = () => reject(new Error('Falha de rede ao enviar o vídeo ao Cloudinary.'))
    xhr.ontimeout = () => reject(new Error('Upload excedeu o tempo limite. Tente novamente.'))
    xhr.send(formData)
  })
}

function uploadChunk({ chunk, start, end, total, uniqueUploadId, signature }) {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', chunk)
    formData.append('api_key', signature.apiKey)
    formData.append('timestamp', String(signature.timestamp))
    formData.append('signature', signature.signature)
    formData.append('folder', signature.folder)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', signature.uploadUrl)
    xhr.setRequestHeader('Content-Range', `bytes ${start}-${end}/${total}`)
    xhr.setRequestHeader('X-Unique-Upload-Id', uniqueUploadId)
    xhr.timeout = 30 * 60 * 1000

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText || '{}'))
        } catch {
          reject(new Error('Resposta inválida do Cloudinary.'))
        }
        return
      }
      reject(new Error(parseUploadError(xhr, `Erro no upload (${xhr.status || 'rede'}).`)))
    }

    xhr.onerror = () => reject(new Error('Falha de rede ao enviar o vídeo ao Cloudinary.'))
    xhr.ontimeout = () => reject(new Error('Upload excedeu o tempo limite. Tente novamente.'))
    xhr.send(formData)
  })
}

async function uploadChunkWithRetry(params) {
  let lastError = null
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await uploadChunk(params)
    } catch (error) {
      lastError = error
      if (attempt < MAX_ATTEMPTS) await wait(700 * attempt)
    }
  }
  throw lastError || new Error('Falha ao enviar parte do vídeo.')
}

async function uploadChunked(file, signature, onProgress) {
  const uniqueUploadId = generateUniqueUploadId()
  const total = file.size
  const chunkCount = Math.ceil(total / CHUNK_SIZE)
  let lastResponse = null

  for (let index = 0; index < chunkCount; index += 1) {
    const start = index * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, total)
    const chunk = file.slice(start, end)

    lastResponse = await uploadChunkWithRetry({
      chunk,
      start,
      end: end - 1,
      total,
      uniqueUploadId,
      signature,
    })

    if (onProgress) {
      const percent = Math.round((end / total) * 100)
      onProgress(Math.min(percent, 99), 'uploading')
    }
  }

  const url = lastResponse?.secure_url
  if (!url) throw new Error('Upload concluído sem URL do vídeo.')
  if (onProgress) onProgress(100, 'uploading')
  return url
}

async function uploadWithSignature(file, signature, onProgress) {
  if (file.size > CHUNK_THRESHOLD) {
    return uploadChunked(file, signature, onProgress)
  }
  return uploadSimple(file, signature, onProgress)
}

/**
 * Envia vídeo direto do navegador ao Cloudinary (sem passar pelo backend).
 */
export async function uploadVideoToCloudinary(file, signature, onProgress) {
  if (!file) throw new Error('Arquivo de vídeo inválido.')
  return uploadWithSignature(file, signature, onProgress)
}

export async function uploadVideoToCloudinaryWithRetry(file, apiBase, token, onProgress) {
  let lastError = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const signature = await fetchVideoUploadSignature(apiBase, token)
      const url = await uploadWithSignature(file, signature, onProgress)
      return url
    } catch (error) {
      lastError = error
      if (onProgress) onProgress(0, 'uploading')
      if (attempt < MAX_ATTEMPTS) await wait(1000 * attempt)
    }
  }

  throw lastError || new Error('Erro no upload do vídeo.')
}
