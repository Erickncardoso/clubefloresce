import { resolveUploadApiUrl } from '~/utils/resolve-api-base.mjs'
import { EBOOK_PDF_MAX_BYTES as DEFAULT_DOCUMENT_MAX_BYTES } from '~/utils/upload-file-kind'

let cachedConfig = null
let configPromise = null

export async function fetchUploadConfig(apiBase) {
  if (cachedConfig) return cachedConfig
  if (configPromise) return configPromise

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null
  configPromise = $fetch(resolveUploadApiUrl('/upload/config', apiBase), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then((config) => {
    cachedConfig = config
    return config
  }).finally(() => {
    configPromise = null
  })

  return configPromise
}

export function getCachedUploadConfig() {
  return cachedConfig
}

export function formatDocumentMaxLabel(bytes) {
  const mb = Math.round(Number(bytes || 0) / (1024 * 1024))
  return mb > 0 ? `${mb} MB` : '40 MB'
}

export function useDocumentUploadLimits() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase

  const documentMaxBytes = ref(DEFAULT_DOCUMENT_MAX_BYTES)
  const documentMaxLabel = computed(() => formatDocumentMaxLabel(documentMaxBytes.value))
  const documentUploadHint = computed(() => `Tamanho máximo: ${documentMaxLabel.value}`)
  const loading = ref(false)

  async function loadUploadConfig() {
    loading.value = true
    try {
      const uploadConfig = await fetchUploadConfig(apiBase)
      if (uploadConfig?.documentMaxBytes) {
        documentMaxBytes.value = uploadConfig.documentMaxBytes
      }
    } catch (error) {
      console.warn('[upload-config] usando limites padrão de PDF', error)
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    loadUploadConfig()
  })

  return {
    documentMaxBytes,
    documentMaxLabel,
    documentUploadHint,
    loading,
    loadUploadConfig,
  }
}
