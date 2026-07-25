import { authFetchInit } from '~/composables/useAuthSession.js'
import { formatCpfMask } from '~/composables/useQuickAddPatient.js'
import {
  normalizeChartTab,
  PATIENT_CHART_TABS,
} from '~/composables/usePatientChartNav.js'
import { resolveUploadApiUrl } from '~/utils/resolve-api-base.mjs'

export { normalizeChartTab }

export function formatCepMask(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

function asProfile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value
}

export function profileToAnamneseForm(user) {
  const profile = asProfile(user?.patientProfileData)
  const tagItems = Array.isArray(profile.tagItems)
    ? profile.tagItems.map((item) => ({
        id: item.id,
        name: item.name,
        color: item.color || '#8B967C',
      }))
    : Array.isArray(profile.tags)
      ? profile.tags.map((name) => ({ name, color: '#8B967C' }))
      : []

  const phoneRaw = String(user?.phone || '').trim()
  return {
    name: user?.name || '',
    nickname: profile.nickname || '',
    email: user?.email || '',
    phone: phoneRaw
      ? (phoneRaw.startsWith('+') ? phoneRaw : `+${phoneRaw.replace(/\D/g, '')}`)
      : '',
    gender: profile.gender || '',
    birthDate: profile.birthDate || '',
    cpf: formatCpfMask(profile.cpf || ''),
    tagItems,
    city: profile.city || '',
    state: profile.state || '',
    occupation: profile.occupation || '',
    maritalStatus: profile.maritalStatus || '',
    modality: profile.modality || '',
    athlete: Boolean(profile.athlete),
    pregnant: Boolean(profile.pregnant),
    lactating: Boolean(profile.lactating),
    objective: profile.objective || '',
    notes: profile.notes || '',
    zipCode: formatCepMask(profile.zipCode || ''),
    neighborhood: profile.neighborhood || '',
    street: profile.street || '',
    streetNumber: profile.streetNumber || '',
  }
}

export function buildPatientProfilePayload(form) {
  return {
    nickname: form.nickname || null,
    gender: form.gender || null,
    birthDate: form.birthDate || null,
    cpf: form.cpf || null,
    tags: form.tagItems?.length ? form.tagItems.map((item) => item.name) : null,
    tagItems: form.tagItems?.length
      ? form.tagItems.map((item) => ({
          id: item.id,
          name: item.name,
          color: String(item.color || '#8B967C').trim().toUpperCase(),
        }))
      : null,
    city: form.city || null,
    state: form.state || null,
    occupation: form.occupation || null,
    maritalStatus: form.maritalStatus || null,
    modality: form.modality || null,
    athlete: form.athlete || null,
    pregnant: form.pregnant || null,
    lactating: form.lactating || null,
    objective: form.objective || null,
    notes: form.notes || null,
    zipCode: form.zipCode || null,
    neighborhood: form.neighborhood || null,
    street: form.street || null,
    streetNumber: form.streetNumber || null,
  }
}

export function usePatientChart(patientIdRef) {
  const apiBase = useApiBase()
  const route = useRoute()
  const router = useRouter()

  const loading = ref(true)
  const error = ref('')
  const user = ref(null)
  const overview = ref(null)
  const mealPlan = ref(null)
  const foodDiary = ref([])
  const checkInHistory = ref([])
  const templateResponses = ref([])
  const currentWeekStart = ref('')
  const savingAnamnese = ref(false)
  const anamneseError = ref('')
  const anamneseSuccess = ref('')
  const savingAccess = ref(false)
  const lookingUpCep = ref(false)
  const cepLookupError = ref('')
  let cepLookupSeq = 0
  let cepLookupTimer = null

  const activeTab = ref(normalizeChartTab(route.query.tab))
  const evolucaoSubTab = ref(
    String(route.query.sub || '') ||
    (['checkins', 'nutricao', 'metas', 'fotos', 'diario'].includes(String(route.query.tab))
      ? String(route.query.tab)
      : 'checkins'),
  )

  const profile = computed(() => asProfile(user.value?.patientProfileData))

  const tabs = PATIENT_CHART_TABS

  const primaryTabIds = [
    'visao',
    'planos',
    'anamnese',
    'orientacoes',
    'documentos',
    'antropometria',
    'gastos',
    'exames',
  ]

  const moreTabIds = ['prescricoes', 'pagamentos', 'arquivos', 'questionarios', 'evolucao']

  const primaryTabs = computed(() => tabs.filter((tab) => primaryTabIds.includes(tab.id)))
  const moreTabs = computed(() => tabs.filter((tab) => moreTabIds.includes(tab.id)))

  function setTab(tabId) {
    activeTab.value = normalizeChartTab(tabId)
    const query = { ...route.query, tab: activeTab.value }
    if (activeTab.value === 'evolucao') {
      query.sub = evolucaoSubTab.value
    } else {
      delete query.sub
    }
    router.replace({ query })
  }

  function setEvolucaoSubTab(sub) {
    evolucaoSubTab.value = sub
    if (activeTab.value === 'evolucao') {
      router.replace({ query: { ...route.query, tab: 'evolucao', sub } })
    }
  }

  watch(
    () => route.query.tab,
    (tab) => {
      activeTab.value = normalizeChartTab(tab)
      if (['checkins', 'nutricao', 'metas', 'fotos', 'diario'].includes(String(tab))) {
        evolucaoSubTab.value = String(tab)
      }
    },
  )

  async function loadUser() {
    user.value = await $fetch(`${apiBase.value}/users/${patientIdRef.value}`, authFetchInit())
  }

  async function loadOverview() {
    overview.value = await $fetch(
      `${apiBase.value}/patients/${patientIdRef.value}/overview`,
      authFetchInit(),
    )
    const overviewPlan = overview.value?.mealPlan
    if (!overviewPlan) return
    // Overview traz resumo; não sobrescreve refeições já carregadas do detalhe
    mealPlan.value = {
      ...(mealPlan.value || {}),
      id: overviewPlan.id || mealPlan.value?.id,
      title: overviewPlan.title || mealPlan.value?.title,
      fileName: overviewPlan.fileName || mealPlan.value?.fileName,
      pdfUrl: overviewPlan.pdfUrl || mealPlan.value?.pdfUrl || null,
      mealCount: overviewPlan.mealCount,
      updatedAt: overviewPlan.updatedAt || mealPlan.value?.updatedAt,
      plan: mealPlan.value?.plan || overviewPlan.plan || null,
    }
  }

  async function loadCheckIns() {
    const [legacyData, responsesData] = await Promise.all([
      $fetch(`${apiBase.value}/checkin/patients/${patientIdRef.value}`, authFetchInit()),
      $fetch(`${apiBase.value}/checkin/patients/${patientIdRef.value}/responses`, authFetchInit()),
    ])
    currentWeekStart.value = legacyData.weekStart
    checkInHistory.value = legacyData.history || []
    templateResponses.value = responsesData.responses || []
    return legacyData
  }

  async function loadFoodDiary() {
    const data = await $fetch(
      `${apiBase.value}/patients/${patientIdRef.value}/food-diary`,
      authFetchInit(),
    )
    foodDiary.value = data.entries || []
  }

  async function loadMealPlanDetail() {
    const data = await $fetch(
      `${apiBase.value}/patients/${patientIdRef.value}/meal-plan`,
      authFetchInit(),
    )
    const plan = data?.plan || data
    mealPlan.value = plan || null
  }

  async function uploadMealPlan(file) {
    const formData = new FormData()
    formData.append('file', file)
    const result = await $fetch(
      resolveUploadApiUrl(`/patients/${patientIdRef.value}/meal-plan/upload`, apiBase.value),
      authFetchInit({ method: 'POST', body: formData }),
    )
    // Troca completa: PDF, refeições, metas e metadados do plano novo
    mealPlan.value = result?.plan || null
    if (result?.user) {
      user.value = { ...user.value, ...result.user }
    }
    await loadOverview()
    return result
  }

  async function loadAll() {
    loading.value = true
    error.value = ''
    try {
      await loadUser()
      await Promise.allSettled([
        loadOverview(),
        loadCheckIns(),
        loadFoodDiary(),
      ])
      // Garante perfil completo mesmo se algum endpoint vier parcial
      if (
        overview.value?.patient?.patientProfileData
        && (!user.value?.patientProfileData || Object.keys(asProfile(user.value.patientProfileData)).length === 0)
      ) {
        user.value = {
          ...user.value,
          patientProfileData: overview.value.patient.patientProfileData,
          phone: user.value?.phone || overview.value.patient.phone,
        }
      }
      if (activeTab.value === 'planos') {
        await loadMealPlanDetail()
      }
    } catch (err) {
      error.value = err?.data?.error || err?.data?.message || 'Não foi possível carregar o paciente.'
    } finally {
      loading.value = false
    }
  }

  async function saveAnamnese(form) {
    savingAnamnese.value = true
    anamneseError.value = ''
    anamneseSuccess.value = ''
    try {
      const phoneDigits = String(form.phone || '').replace(/\D/g, '')
      const updated = await $fetch(`${apiBase.value}/users/${patientIdRef.value}`, authFetchInit({
        method: 'PATCH',
        body: {
          name: form.name?.trim(),
          phone: phoneDigits || null,
          patientProfile: buildPatientProfilePayload(form),
        },
      }))
      user.value = updated
      if (overview.value?.patient) {
        overview.value.patient = {
          ...overview.value.patient,
          name: updated.name,
          phone: updated.phone,
          avatar: updated.avatar,
        }
      }
      anamneseSuccess.value = 'Dados cadastrais salvos com sucesso.'
      return updated
    } catch (err) {
      anamneseError.value = err?.data?.error || err?.message || 'Erro ao salvar dados cadastrais.'
      throw err
    } finally {
      savingAnamnese.value = false
    }
  }

  async function saveAccess(payload) {
    savingAccess.value = true
    try {
      const updated = await $fetch(`${apiBase.value}/users/${patientIdRef.value}`, authFetchInit({
        method: 'PATCH',
        body: payload,
      }))
      user.value = { ...user.value, ...updated }
      if (overview.value?.patient) {
        overview.value.patient = { ...overview.value.patient, ...updated }
      }
      return updated
    } finally {
      savingAccess.value = false
    }
  }

  async function lookupCep(digits, form) {
    const seq = ++cepLookupSeq
    lookingUpCep.value = true
    cepLookupError.value = ''
    try {
      const data = await $fetch(`${apiBase.value}/users/cep/${digits}`, authFetchInit())
      if (seq !== cepLookupSeq) return
      if (data.neighborhood) form.neighborhood = String(data.neighborhood).slice(0, 80)
      if (data.street) form.street = String(data.street).slice(0, 120)
      if (data.city) form.city = String(data.city).slice(0, 80)
      if (data.state) form.state = String(data.state).trim().toUpperCase()
      if (data.zipCode) form.zipCode = formatCepMask(data.zipCode)
    } catch (err) {
      if (seq !== cepLookupSeq) return
      cepLookupError.value = err?.data?.error || 'Não foi possível buscar o CEP.'
    } finally {
      if (seq === cepLookupSeq) lookingUpCep.value = false
    }
  }

  function onCepInput(event, form) {
    form.zipCode = formatCepMask(event?.target?.value ?? form.zipCode)
    const digits = String(form.zipCode || '').replace(/\D/g, '')
    cepLookupError.value = ''
    if (cepLookupTimer) {
      clearTimeout(cepLookupTimer)
      cepLookupTimer = null
    }
    if (digits.length !== 8) {
      lookingUpCep.value = false
      return
    }
    cepLookupTimer = setTimeout(() => {
      cepLookupTimer = null
      lookupCep(digits, form)
    }, 250)
  }

  async function saveCheckIn(body) {
    await $fetch(`${apiBase.value}/checkin/patients/${patientIdRef.value}`, authFetchInit({
      method: 'PUT',
      body,
    }))
    await Promise.all([loadCheckIns(), loadOverview()])
  }

  return {
    tabs,
    primaryTabs,
    moreTabs,
    activeTab,
    evolucaoSubTab,
    setTab,
    setEvolucaoSubTab,
    loading,
    error,
    user,
    profile,
    overview,
    mealPlan,
    foodDiary,
    checkInHistory,
    templateResponses,
    currentWeekStart,
    savingAnamnese,
    anamneseError,
    anamneseSuccess,
    savingAccess,
    lookingUpCep,
    cepLookupError,
    loadAll,
    loadMealPlanDetail,
    saveAnamnese,
    saveAccess,
    onCepInput,
    uploadMealPlan,
    saveCheckIn,
    profileToAnamneseForm,
  }
}
