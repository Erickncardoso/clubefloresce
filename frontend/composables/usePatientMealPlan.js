import { apiConnectionErrorMessage, isApiConnectionError, resolveDirectApiUrl } from '~/utils/resolve-api-base.mjs'

export function usePatientMealPlan() {
  const config = useRuntimeConfig()
  const planRecord = useState('patient-meal-plan', () => null)
  const loading = ref(false)
  const uploading = ref(false)
  const error = ref('')

  const hasPlan = computed(() => Boolean(planRecord.value?.plan?.meals?.length))

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
  })

  async function fetchPlan() {
    loading.value = true
    error.value = ''
    try {
      const res = await $fetch(`${config.public.apiBase}/meal-plan/me`, {
        headers: authHeaders(),
      })
      planRecord.value = res.plan ?? null
    } catch {
      planRecord.value = null
    } finally {
      loading.value = false
    }
  }

  function resolveUploadError(err) {
    const data = err?.data
    if (typeof data === 'string' && data.trim()) return data
    if (data?.message) return data.message

    if (err?.statusCode === 401) return 'Sessão expirada. Faça login novamente.'
    if (err?.statusCode === 404) {
      return 'Rota do plano alimentar não encontrada no servidor. Reinicie o backend com a versão mais recente.'
    }

    const message = String(err?.message || '')
    if (isApiConnectionError(err)) {
      return apiConnectionErrorMessage({
        dev: import.meta.dev,
        hostname: import.meta.client ? window.location.hostname : undefined,
      })
    }

    return message || 'Não foi possível importar o PDF.'
  }

  async function uploadPdf(file) {
    if (!file) return null

    const token = localStorage.getItem('auth_token')
    if (!token) {
      error.value = 'Faça login para importar seu plano alimentar.'
      return null
    }

    uploading.value = true
    error.value = ''

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await $fetch(resolveDirectApiUrl('/meal-plan/upload', config.public.apiBase), {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      })
      planRecord.value = res.plan ?? null
      return planRecord.value
    } catch (err) {
      error.value = resolveUploadError(err)
      throw err
    } finally {
      uploading.value = false
    }
  }

  return {
    planRecord,
    hasPlan,
    loading,
    uploading,
    error,
    fetchPlan,
    uploadPdf,
  }
}
