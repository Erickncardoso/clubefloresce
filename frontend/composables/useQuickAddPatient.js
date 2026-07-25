import { h } from 'vue'
import { authFetchInit } from '~/composables/useAuthSession.js'
import { resolveUploadApiUrl } from '~/utils/resolve-api-base.mjs'
import ModalityIcon from '~/components/patients/ModalityIcon.vue'

function modalityIcon(name) {
  return {
    name: `ModalityIcon_${name || 'unset'}`,
    render() {
      return h(ModalityIcon, { name })
    },
  }
}

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

export function emptyQuickAddForm() {
  return {
    name: '',
    nickname: '',
    email: '',
    password: '',
    phone: '',
    gender: '',
    birthDate: '',
    cpf: '',
    tags: [],
    tagItems: [],
    city: '',
    state: '',
    occupation: '',
    maritalStatus: '',
    modality: '',
    athlete: false,
    pregnant: false,
    lactating: false,
    objective: '',
    notes: '',
    zipCode: '',
    neighborhood: '',
    street: '',
    streetNumber: '',
    plan: 'PREMIUM',
    status: 'ATIVO',
    accessExpiresAt: '',
    billingPaymentMethod: '',
    avatarUrl: '',
    sendWelcomeWhatsapp: true,
    welcomeMessageOverride: '',
  }
}

export function formatCepMask(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

function toDateInputValue(value) {
  if (!value) return ''
  const d = new Date(value)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function userToQuickAddSeed(user) {
  if (!user) return null
  const profile = user.patientProfileData && typeof user.patientProfileData === 'object' && !Array.isArray(user.patientProfileData)
    ? user.patientProfileData
    : {}
  const tagItems = Array.isArray(profile.tagItems)
    ? profile.tagItems.map((item) => ({
        id: item.id,
        name: item.name,
        color: item.color || '#8B967C',
      }))
    : Array.isArray(profile.tags)
      ? profile.tags.map((name) => ({ name, color: '#8B967C' }))
      : []
  const phoneRaw = String(user.phone || '').trim()

  return {
    name: user.name || '',
    nickname: profile.nickname || '',
    email: user.email || '',
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
    plan: user.plan || 'PREMIUM',
    status: user.status || 'ATIVO',
    accessExpiresAt: toDateInputValue(user.accessExpiresAt),
    billingPaymentMethod: user.billingPaymentMethod || '',
    avatarUrl: user.avatar || '',
  }
}

export function formatCpfMask(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function useQuickAddPatient() {
  const apiBase = useApiBase()
  const form = reactive(emptyQuickAddForm())
  const avatarFile = ref(null)
  const avatarPreview = ref('')
  const submitting = ref(false)
  const uploadingAvatar = ref(false)
  const lookingUpCep = ref(false)
  const cepLookupError = ref('')
  const error = ref('')
  const welcomeTemplate = ref('')
  const welcomeTemplateLoaded = ref(false)
  let cepLookupSeq = 0
  let cepLookupTimer = null

  const planOptions = [
    { value: 'FREE', label: 'Sem plano (só dieta e metas)' },
    { value: 'PREMIUM', label: 'Essencial' },
    { value: 'PLATINUM', label: 'Completo' },
  ]

  const accessDurationPresets = [
    { days: 30, label: '30 dias' },
    { days: 60, label: '60 dias' },
    { days: 90, label: '90 dias' },
    { days: null, label: 'Sem limite' },
  ]

  function addDaysToDateInput(days) {
    const now = new Date()
    now.setUTCDate(now.getUTCDate() + days)
    const y = now.getUTCFullYear()
    const m = String(now.getUTCMonth() + 1).padStart(2, '0')
    const d = String(now.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  function applyAccessDuration(days) {
    form.accessExpiresAt = days == null ? '' : addDaysToDateInput(days)
  }

  const isFreePlan = computed(() => form.plan === 'FREE')
  const accessHint = computed(() => {
    if (isFreePlan.value) {
      return 'Sem plano: a paciente acessa só dieta e metas. Sem Bella, cursos, comunidade e demais recursos.'
    }
    if (!form.accessExpiresAt) {
      return 'Validade em branco = acesso sem data limite ao plano escolhido.'
    }
    return 'Acesso completo ao app até a data informada.'
  })

  const paymentMethodOptions = [
    { value: '', label: 'Não informado' },
    { value: 'pix', label: 'Pix' },
    { value: 'card', label: 'Cartão' },
  ]

  const genderOptions = [
    { value: '', label: 'Não informado' },
    { value: 'female', label: 'Feminino' },
    { value: 'male', label: 'Masculino' },
    { value: 'other', label: 'Outro' },
    { value: 'prefer_not_say', label: 'Prefiro não dizer' },
  ]

  const maritalOptions = [
    { value: '', label: 'Não informado' },
    { value: 'single', label: 'Solteira(o)' },
    { value: 'married', label: 'Casada(o)' },
    { value: 'stable_union', label: 'União estável' },
    { value: 'divorced', label: 'Divorciada(o)' },
    { value: 'widowed', label: 'Viúva(o)' },
    { value: 'other', label: 'Outro' },
  ]

  const modalityOptions = [
    { value: '', label: 'Não informado', icon: modalityIcon('unset') },
    { value: 'online', label: 'Online', icon: modalityIcon('online') },
    { value: 'presencial', label: 'Presencial', icon: modalityIcon('presencial') },
  ]

  const stateOptions = [
    { value: '', label: 'UF' },
    ...BR_STATES.map((uf) => ({ value: uf, label: uf })),
  ]

  const minAccessDate = computed(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  })

  function resetForm(seed = null) {
    if (cepLookupTimer) {
      clearTimeout(cepLookupTimer)
      cepLookupTimer = null
    }
    cepLookupSeq += 1
    lookingUpCep.value = false
    cepLookupError.value = ''
    Object.assign(form, emptyQuickAddForm())
    avatarFile.value = null
    if (avatarPreview.value?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview.value)
    avatarPreview.value = ''
    error.value = ''

    if (seed) {
      form.name = seed.name || ''
      form.nickname = seed.nickname || ''
      form.email = seed.email || ''
      form.gender = seed.gender || ''
      form.birthDate = seed.birthDate || ''
      form.cpf = seed.cpf || ''
      form.city = seed.city || ''
      form.state = seed.state || ''
      form.occupation = seed.occupation || ''
      form.maritalStatus = seed.maritalStatus || ''
      form.modality = seed.modality || ''
      form.athlete = Boolean(seed.athlete)
      form.pregnant = Boolean(seed.pregnant)
      form.lactating = Boolean(seed.lactating)
      form.objective = seed.objective || ''
      form.notes = seed.notes || ''
      form.zipCode = seed.zipCode || ''
      form.neighborhood = seed.neighborhood || ''
      form.street = seed.street || ''
      form.streetNumber = seed.streetNumber || ''
      form.plan = seed.plan || 'PREMIUM'
      form.status = seed.status || 'ATIVO'
      form.accessExpiresAt = seed.accessExpiresAt || ''
      form.billingPaymentMethod = seed.billingPaymentMethod || ''
      form.avatarUrl = seed.avatarUrl || ''
      form.tagItems = Array.isArray(seed.tagItems) ? seed.tagItems.map((item) => ({ ...item })) : []
      if (seed.phone) {
        const raw = String(seed.phone).trim()
        form.phone = raw.startsWith('+') ? raw : `+${raw.replace(/\D/g, '')}`
      }
    }
  }

  function onCpfInput(event) {
    form.cpf = formatCpfMask(event?.target?.value ?? form.cpf)
  }

  function formatCepMask(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 5) return digits
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }

  async function lookupCep(digits) {
    const seq = ++cepLookupSeq
    lookingUpCep.value = true
    cepLookupError.value = ''
    try {
      const data = await $fetch(`${apiBase.value}/users/cep/${digits}`, authFetchInit())
      if (seq !== cepLookupSeq) return
      if (!data) {
        cepLookupError.value = 'CEP não encontrado.'
        return
      }

      if (data.neighborhood) form.neighborhood = String(data.neighborhood).slice(0, 80)
      if (data.street) form.street = String(data.street).slice(0, 120)
      if (data.city) form.city = String(data.city).slice(0, 80)
      if (data.state) {
        const uf = String(data.state).trim().toUpperCase()
        if (BR_STATES.includes(uf)) form.state = uf
      }
      if (data.zipCode) form.zipCode = formatCepMask(data.zipCode)
    } catch (err) {
      if (seq !== cepLookupSeq) return
      cepLookupError.value = err?.data?.error || 'Não foi possível buscar o CEP.'
    } finally {
      if (seq === cepLookupSeq) lookingUpCep.value = false
    }
  }

  function onCepInput(event) {
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
      lookupCep(digits)
    }, 250)
  }

  function onAvatarPick(event) {
    const file = event?.target?.files?.[0]
    if (!file) return
    if (!file.type?.startsWith('image/')) {
      error.value = 'Selecione uma imagem válida.'
      return
    }
    avatarFile.value = file
    if (avatarPreview.value?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview.value)
    avatarPreview.value = URL.createObjectURL(file)
    form.avatarUrl = ''
  }

  function clearAvatar() {
    avatarFile.value = null
    if (avatarPreview.value?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview.value)
    avatarPreview.value = ''
    form.avatarUrl = ''
  }

  async function ensureWelcomeTemplate() {
    if (welcomeTemplateLoaded.value) return welcomeTemplate.value
    try {
      const data = await $fetch(`${apiBase.value}/users/approval-whatsapp-template`, authFetchInit())
      welcomeTemplate.value = data?.message || ''
      if (!form.welcomeMessageOverride) {
        form.welcomeMessageOverride = welcomeTemplate.value
      }
      welcomeTemplateLoaded.value = true
      return welcomeTemplate.value
    } catch {
      welcomeTemplateLoaded.value = true
      return ''
    }
  }

  async function uploadAvatarIfNeeded() {
    if (!avatarFile.value) return form.avatarUrl || null
    uploadingAvatar.value = true
    try {
      const formData = new FormData()
      formData.append('file', avatarFile.value)
      const res = await $fetch(resolveUploadApiUrl('/upload', apiBase.value), authFetchInit({
        method: 'POST',
        body: formData,
      }))
      const url = res?.url || res?.secure_url || null
      if (!url) throw new Error('Upload da foto não retornou URL.')
      form.avatarUrl = url
      return url
    } finally {
      uploadingAvatar.value = false
    }
  }

  function buildPatientProfilePayload() {
    return {
      nickname: form.nickname || null,
      gender: form.gender || null,
      birthDate: form.birthDate || null,
      cpf: form.cpf || null,
      tags: form.tagItems.length
        ? form.tagItems.map((item) => item.name)
        : (form.tags.length ? [...form.tags] : null),
      tagItems: form.tagItems.length ? form.tagItems.map((item) => ({
        id: item.id,
        name: item.name,
        color: String(item.color || '#8B967C').trim().toUpperCase(),
      })) : null,
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

  async function submit({ registrationRequestId = null, requireAccessExpires = false } = {}) {
    submitting.value = true
    error.value = ''

    try {
      if (!form.name?.trim() || !form.email?.trim()) {
        throw new Error('Nome e e-mail são obrigatórios.')
      }

      if (!registrationRequestId && !form.password?.trim()) {
        throw new Error('Informe a senha inicial.')
      }

      if (requireAccessExpires && !form.accessExpiresAt && form.plan !== 'FREE') {
        throw new Error('Informe até quando o paciente terá acesso.')
      }

      const avatar = await uploadAvatarIfNeeded()
      const phoneDigits = String(form.phone || '').replace(/\D/g, '')

      const body = {
        name: form.name.trim(),
        email: form.email.trim(),
        plan: form.plan,
        accessExpiresAt: form.accessExpiresAt || null,
        billingPaymentMethod: form.billingPaymentMethod || null,
        phone: phoneDigits || null,
        avatar: avatar || null,
        patientProfile: buildPatientProfilePayload(),
        sendWelcomeWhatsapp: Boolean(form.sendWelcomeWhatsapp),
        welcomeMessageOverride:
          registrationRequestId || form.sendWelcomeWhatsapp
            ? (form.welcomeMessageOverride || null)
            : null,
      }

      if (registrationRequestId) {
        body.registrationRequestId = registrationRequestId
      } else {
        body.password = form.password
      }

      const user = await $fetch(`${apiBase.value}/users`, authFetchInit({
        method: 'POST',
        body,
      }))

      return user
    } catch (err) {
      error.value = err?.data?.error || err?.message || 'Erro ao criar paciente.'
      throw err
    } finally {
      submitting.value = false
    }
  }

  async function submitEdit(userId) {
    if (!userId) throw new Error('Paciente não informado.')
    submitting.value = true
    error.value = ''

    try {
      if (!form.name?.trim()) {
        throw new Error('Nome é obrigatório.')
      }

      const avatar = await uploadAvatarIfNeeded()
      const phoneDigits = String(form.phone || '').replace(/\D/g, '')

      const body = {
        name: form.name.trim(),
        phone: phoneDigits || null,
        plan: form.plan,
        status: form.status,
        accessExpiresAt: form.accessExpiresAt || null,
        billingPaymentMethod: form.billingPaymentMethod || null,
        patientProfile: buildPatientProfilePayload(),
      }

      if (avatar) body.avatar = avatar

      const user = await $fetch(`${apiBase.value}/users/${userId}`, authFetchInit({
        method: 'PATCH',
        body,
      }))

      return user
    } catch (err) {
      error.value = err?.data?.error || err?.message || 'Erro ao salvar paciente.'
      throw err
    } finally {
      submitting.value = false
    }
  }

  return {
    form,
    avatarFile,
    avatarPreview,
    submitting,
    uploadingAvatar,
    lookingUpCep,
    cepLookupError,
    error,
    welcomeTemplate,
    planOptions,
    accessDurationPresets,
    applyAccessDuration,
    isFreePlan,
    accessHint,
    paymentMethodOptions,
    genderOptions,
    maritalOptions,
    modalityOptions,
    stateOptions,
    minAccessDate,
    resetForm,
    onCpfInput,
    onCepInput,
    onAvatarPick,
    clearAvatar,
    ensureWelcomeTemplate,
    submit,
    submitEdit,
  }
}
