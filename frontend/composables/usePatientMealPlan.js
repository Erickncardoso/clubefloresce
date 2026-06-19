import { apiConnectionErrorMessage, isApiConnectionError, resolveUploadApiUrl } from '~/utils/resolve-api-base.mjs'

function showUploadResultToast({ successTitle, errorMessage }) {
  if (!import.meta.client) return

  nextTick(() => {
    window.setTimeout(() => {
      const { showToast } = useAppToast()
      if (successTitle) {
        showToast({ type: 'success', title: successTitle })
        return
      }
      if (errorMessage) {
        showToast({
          type: 'error',
          title: 'Não foi possível atualizar o cardápio',
          message: errorMessage,
          duration: 5500,
        })
      }
    }, 180)
  })
}

export function usePatientMealPlan() {
  const config = useRuntimeConfig()
  const planRecord = useState('patient-meal-plan', () => null)
  const planChecked = useState('patient-meal-plan-checked', () => false)
  const loading = useState('patient-meal-plan-loading', () => false)
  const uploading = useState('patient-meal-plan-uploading', () => false)
  const error = useState('patient-meal-plan-error', () => '')

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

      const planName = planRecord.value?.patientName || planRecord.value?.plan?.patientName
      if (planName) {
        const { profile, persistSession } = usePatientApp()
        const currentName = profile.value.name?.trim() || ''
        if (!currentName || currentName.toLowerCase() === 'paciente') {
          persistSession({ name: planName })
        }
      }
    } catch {
      planRecord.value = null
    } finally {
      loading.value = false
      planChecked.value = true
    }
  }

  function resetPlan() {
    planRecord.value = null
    planChecked.value = false
    error.value = ''
    uploading.value = false
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

    const isUpdate = hasPlan.value
    const uploadHadPlan = useState('patient-meal-plan-upload-had-plan', () => false)
    uploadHadPlan.value = isUpdate

    uploading.value = true
    error.value = ''

    const formData = new FormData()
    formData.append('file', file)

    let successTitle = null
    let errorMessage = null

    try {
      const res = await $fetch(resolveUploadApiUrl('/meal-plan/upload', config.public.apiBase), {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      })
      planRecord.value = res.plan ?? null
      planChecked.value = true

      if (res.user?.name) {
        const { persistSession } = usePatientApp()
        persistSession({
          name: res.user.name,
          avatar: res.user.avatar,
          createdAt: res.user.createdAt,
        })
      }

      if (res.nutritionTargets) {
        const nutritionRefresh = useState('patient-nutrition-refresh', () => 0)
        nutritionRefresh.value += 1
      }

      successTitle = isUpdate ? 'Cardápio atualizado' : 'Cardápio importado'
      return planRecord.value
    } catch (err) {
      errorMessage = resolveUploadError(err)
      error.value = errorMessage
      throw err
    } finally {
      uploading.value = false
      showUploadResultToast({ successTitle, errorMessage })
    }
  }

  return {
    planRecord,
    planChecked,
    hasPlan,
    loading,
    uploading,
    error,
    fetchPlan,
    uploadPdf,
    resetPlan,
  }
}
