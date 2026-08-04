import { h } from 'vue'
import { authFetchInit } from '~/composables/useAuthSession.js'
import { resolveUploadApiUrl } from '~/utils/resolve-api-base.mjs'
import { normalizePhoneInternational } from '~/utils/phone-countries.js'
import {
  mapAdditionalContactsFromProfile,
  mapAttachmentsFromProfile,
  mapIdentityDocumentsFromProfile,
  mapLinkedContactsFromProfile,
  serializeAdditionalContacts,
  serializeIdentityDocuments,
  serializeLinkedContacts,
  serializeProfileAttachments,
} from '~/utils/patient-profile-extra.js'
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
    rg: '',
    referralSource: '',
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
    country: 'BR',
    addressComplement: '',
    additionalContacts: [],
    emergencyContacts: [],
    guardianEnabled: false,
    guardians: [],
    identityDocuments: [],
    notifyEmail: true,
    notifySms: true,
    notifyWhatsapp: true,
    profileAttachments: [],
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
    phone: phoneRaw ? normalizePhoneInternational(phoneRaw) : '',
    gender: profile.gender || '',
    birthDate: profile.birthDate || '',
    cpf: formatCpfMask(profile.cpf || ''),
    rg: formatRgMask(profile.rg || ''),
    referralSource: profile.referralSource || '',
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
    country: profile.country || 'BR',
    addressComplement: profile.addressComplement || '',
    additionalContacts: mapAdditionalContactsFromProfile(profile.additionalContacts),
    emergencyContacts: mapLinkedContactsFromProfile(profile.emergencyContacts),
    guardianEnabled: Boolean(profile.guardianEnabled),
    guardians: mapLinkedContactsFromProfile(profile.guardians),
    identityDocuments: mapIdentityDocumentsFromProfile(profile.identityDocuments),
    notifyEmail: profile.notifyEmail !== false,
    notifySms: profile.notifySms !== false,
    notifyWhatsapp: profile.notifyWhatsapp !== false,
    profileAttachments: mapAttachmentsFromProfile(profile.profileAttachments),
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

export function formatRgMask(value) {
  const raw = String(value || '').replace(/[^\dA-Za-z]/g, '').toUpperCase().slice(0, 12)
  if (raw.length <= 2) return raw
  if (raw.length <= 5) return `${raw.slice(0, 2)}.${raw.slice(2)}`
  if (raw.length <= 8) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`
  return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}-${raw.slice(8)}`
}

export function useQuickAddPatient() {
  const apiBase = useApiBase()
  const form = reactive(emptyQuickAddForm())
  const avatarFile = ref(null)
  const avatarPreview = ref('')
  const submitting = ref(false)
  const uploadingAvatar = ref(false)
  const uploadingAttachments = ref(false)
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
      form.cpf = seed.cpf ? formatCpfMask(seed.cpf) : ''
      form.rg = seed.rg ? formatRgMask(seed.rg) : ''
      form.referralSource = seed.referralSource || ''
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
      form.zipCode = seed.zipCode ? formatCepMask(seed.zipCode) : ''
      form.neighborhood = seed.neighborhood || ''
      form.street = seed.street || ''
      form.streetNumber = seed.streetNumber || ''
      form.country = seed.country || 'BR'
      form.addressComplement = seed.addressComplement || ''
      form.additionalContacts = Array.isArray(seed.additionalContacts)
        ? seed.additionalContacts.map((item) => ({ ...item }))
        : []
      form.emergencyContacts = Array.isArray(seed.emergencyContacts)
        ? seed.emergencyContacts.map((item) => ({ ...item }))
        : []
      form.guardianEnabled = Boolean(seed.guardianEnabled)
      form.guardians = Array.isArray(seed.guardians)
        ? seed.guardians.map((item) => ({ ...item }))
        : []
      form.identityDocuments = Array.isArray(seed.identityDocuments)
        ? seed.identityDocuments.map((item) => ({ ...item }))
        : []
      form.notifyEmail = seed.notifyEmail !== false
      form.notifySms = seed.notifySms !== false
      form.notifyWhatsapp = seed.notifyWhatsapp !== false
      form.profileAttachments = Array.isArray(seed.profileAttachments)
        ? seed.profileAttachments.map((item) => ({ ...item }))
        : []
      form.plan = seed.plan || 'PREMIUM'
      form.status = seed.status || 'ATIVO'
      form.accessExpiresAt = seed.accessExpiresAt || ''
      form.billingPaymentMethod = seed.billingPaymentMethod || ''
      form.avatarUrl = seed.avatarUrl || ''
      form.tagItems = Array.isArray(seed.tagItems) ? seed.tagItems.map((item) => ({ ...item })) : []
      if (seed.phone) {
        form.phone = normalizePhoneInternational(seed.phone)
      }
    }
  }

  function onCpfInput(event) {
    form.cpf = formatCpfMask(event?.target?.value ?? form.cpf)
  }

  function onRgInput(event) {
    form.rg = formatRgMask(event?.target?.value ?? form.rg)
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

  async function uploadAttachmentsIfNeeded() {
    const pending = (form.profileAttachments || []).filter((item) => item.file && !item.url)
    if (!pending.length) return

    uploadingAttachments.value = true
    try {
      for (const item of pending) {
        const formData = new FormData()
        formData.append('file', item.file)
        const res = await $fetch(resolveUploadApiUrl('/upload/file', apiBase.value), authFetchInit({
          method: 'POST',
          body: formData,
        }))
        const url = res?.url || res?.secure_url || null
        if (!url) throw new Error(`Upload de "${item.name}" não retornou URL.`)
        item.url = url
        item.uploadedAt = new Date().toISOString()
        item.file = null
      }
    } finally {
      uploadingAttachments.value = false
    }
  }

  function buildPatientProfilePayload() {
    const additionalContacts = serializeAdditionalContacts(form.additionalContacts)
    const emergencyContacts = serializeLinkedContacts(form.emergencyContacts)
    const guardians = form.guardianEnabled ? serializeLinkedContacts(form.guardians) : []
    const identityDocuments = serializeIdentityDocuments(form.identityDocuments)
    const profileAttachments = serializeProfileAttachments(form.profileAttachments)

    return {
      nickname: form.nickname || null,
      gender: form.gender || null,
      birthDate: form.birthDate || null,
      cpf: form.cpf || null,
      rg: form.rg || null,
      referralSource: form.referralSource || null,
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
      country: form.country || 'BR',
      addressComplement: form.addressComplement || null,
      additionalContacts: additionalContacts.length ? additionalContacts : null,
      emergencyContacts: emergencyContacts.length ? emergencyContacts : null,
      guardianEnabled: form.guardianEnabled || null,
      guardians: guardians.length ? guardians : null,
      identityDocuments: identityDocuments.length ? identityDocuments : null,
      notifyEmail: form.notifyEmail,
      notifySms: form.notifySms,
      notifyWhatsapp: form.notifyWhatsapp,
      profileAttachments: profileAttachments.length ? profileAttachments : null,
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
      await uploadAttachmentsIfNeeded()
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
      await uploadAttachmentsIfNeeded()
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

  const referralSourceOptions = [
    { value: '', label: 'Selecione a origem' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'indicacao', label: 'Indicação' },
    { value: 'google', label: 'Google' },
    { value: 'clinica', label: 'Clínica / parceiro' },
    { value: 'outro', label: 'Outro' },
  ]

  return {
    form,
    avatarFile,
    avatarPreview,
    submitting,
    uploadingAvatar,
    uploadingAttachments,
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
    referralSourceOptions,
    minAccessDate,
    resetForm,
    onCpfInput,
    onRgInput,
    onCepInput,
    onAvatarPick,
    clearAvatar,
    ensureWelcomeTemplate,
    submit,
    submitEdit,
  }
}
