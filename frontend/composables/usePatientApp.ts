/** Helpers da versão app do paciente (preview web / futuro Capacitor). */

export type PatientProfile = {
  name: string
  avatar: string
  createdAt: string
}

const DEFAULT_PROFILE: PatientProfile = {
  name: 'Paciente',
  avatar: '',
  createdAt: '',
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'P'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
}

function readStorageProfile(): PatientProfile {
  if (import.meta.server) return { ...DEFAULT_PROFILE }
  return {
    name: localStorage.getItem('user_name') || DEFAULT_PROFILE.name,
    avatar: localStorage.getItem('user_avatar') || '',
    createdAt: localStorage.getItem('user_created_at') || '',
  }
}

function isPlaceholderPatientName(name: string) {
  const normalized = String(name || '').trim().toLowerCase()
  return !normalized || normalized === 'paciente'
}

export function usePatientApp() {
  const config = useRuntimeConfig()
  const isPatientApp = computed(() => Boolean(config.public.mobileApp))
  const profile = useState<PatientProfile>('patient-profile', () => readStorageProfile())

  function readPlanPatientName() {
    const mealPlan = useState('patient-meal-plan', () => null)
    const fromRecord = mealPlan.value?.patientName || mealPlan.value?.plan?.patientName
    const normalized = String(fromRecord || '').replace(/\s+/g, ' ').trim()
    return normalized || ''
  }

  function resolvedProfileName() {
    const profileName = profile.value.name?.trim() || ''
    if (!isPlaceholderPatientName(profileName)) {
      return profileName
    }

    const fromPlan = readPlanPatientName()
    if (fromPlan) return fromPlan

    return profileName || DEFAULT_PROFILE.name
  }

  function hydrateProfile() {
    profile.value = readStorageProfile()
  }

  function persistSession(user: {
    name?: string | null
    avatar?: string | null
    createdAt?: string | Date | null
  }) {
    if (import.meta.server) return

    const stored = readStorageProfile()
    const current = profile.value

    const name = 'name' in user
      ? (String(user.name || DEFAULT_PROFILE.name).trim() || DEFAULT_PROFILE.name)
      : (current.name || stored.name || DEFAULT_PROFILE.name)

    const avatar = 'avatar' in user
      ? String(user.avatar || '').trim()
      : (current.avatar || stored.avatar || '')

    const createdAt = 'createdAt' in user
      ? (user.createdAt ? new Date(user.createdAt).toISOString() : '')
      : (current.createdAt || stored.createdAt || '')

    localStorage.setItem('user_name', name)
    if (avatar) localStorage.setItem('user_avatar', avatar)
    else localStorage.removeItem('user_avatar')
    if (createdAt) localStorage.setItem('user_created_at', createdAt)
    else localStorage.removeItem('user_created_at')

    profile.value = { name, avatar, createdAt }
  }

  const patientAuth = usePatientAuth()

  async function uploadProfileAvatar(file: File) {
    if (import.meta.server) throw new Error('Indisponível no servidor.')

    const formData = new FormData()
    formData.append('file', file)

    const user = await $fetch<{
      name: string
      avatar?: string | null
      createdAt?: string
    }>(`${config.public.apiBase}/auth/me/avatar`, {
      method: 'POST',
      headers: patientAuth.authHeaders(),
      body: formData,
    })

    persistSession(user)
    return user
  }

  function clearPatientSession() {
    if (import.meta.server) return
    patientAuth.clearSession()
    profile.value = { ...DEFAULT_PROFILE }
  }

  async function syncPatientProfile() {
    if (import.meta.server) return

    patientAuth.bootstrapToken()
    const token = patientAuth.getToken()
    if (!token) {
      hydrateProfile()
      return
    }

    try {
      const user = await $fetch<{
        name: string
        avatar?: string | null
        createdAt?: string
      }>(`${config.public.apiBase}/auth/me`, {
        headers: patientAuth.authHeaders(),
      })
      persistSession(user)
      await patientAuth.refreshSession()
    } catch (err) {
      if (patientAuth.isSessionExpiredError(err) || patientAuth.isPatientAccessRevokedError(err)) {
        clearPatientSession()
      } else {
        hydrateProfile()
      }
    }
  }

  function applyPatientLayout() {
    if (isPatientApp.value) setPageLayout('patient')
  }

  function userName() {
    return resolvedProfileName().split(' ')[0] || DEFAULT_PROFILE.name
  }

  function userFullName() {
    return resolvedProfileName() || DEFAULT_PROFILE.name
  }

  function userInitials() {
    return initialsFromName(userFullName())
  }

  function userAvatar() {
    return profile.value.avatar || ''
  }

  function memberSinceLabel() {
    const raw = profile.value.createdAt
    if (!raw) return ''
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return ''
    const formatted = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    return formatted.replace(/\s+de\s+/i, ' ').replace(/\.$/, '')
  }

  return {
    isPatientApp,
    profile,
    applyPatientLayout,
    hydrateProfile,
    persistSession,
    clearPatientSession,
    syncPatientProfile,
    uploadProfileAvatar,
    userName,
    userFullName,
    userInitials,
    userAvatar,
    memberSinceLabel,
  }
}
