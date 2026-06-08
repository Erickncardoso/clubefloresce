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

export function usePatientApp() {
  const config = useRuntimeConfig()
  const isPatientApp = computed(() => Boolean(config.public.mobileApp))
  const profile = useState<PatientProfile>('patient-profile', () => ({ ...DEFAULT_PROFILE }))

  function hydrateProfile() {
    profile.value = readStorageProfile()
  }

  function persistSession(user: {
    name?: string | null
    avatar?: string | null
    createdAt?: string | Date | null
  }) {
    if (import.meta.server) return

    const name = String(user.name || DEFAULT_PROFILE.name).trim() || DEFAULT_PROFILE.name
    const avatar = String(user.avatar || '').trim()
    const createdAt = user.createdAt ? new Date(user.createdAt).toISOString() : ''

    localStorage.setItem('user_name', name)
    if (avatar) localStorage.setItem('user_avatar', avatar)
    else localStorage.removeItem('user_avatar')
    if (createdAt) localStorage.setItem('user_created_at', createdAt)
    else localStorage.removeItem('user_created_at')

    profile.value = { name, avatar, createdAt }
  }

  function clearPatientSession() {
    if (import.meta.server) return
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_name')
    localStorage.removeItem('user_id')
    localStorage.removeItem('user_avatar')
    localStorage.removeItem('user_created_at')
    profile.value = { ...DEFAULT_PROFILE }
  }

  async function syncPatientProfile() {
    if (import.meta.server) return
    const token = localStorage.getItem('auth_token')
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
        headers: { Authorization: `Bearer ${token}` },
      })
      persistSession(user)
    } catch {
      hydrateProfile()
    }
  }

  function applyPatientLayout() {
    if (isPatientApp.value) setPageLayout('patient')
  }

  function userName() {
    return profile.value.name.split(' ')[0] || DEFAULT_PROFILE.name
  }

  function userFullName() {
    return profile.value.name || DEFAULT_PROFILE.name
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
    userName,
    userFullName,
    userInitials,
    userAvatar,
    memberSinceLabel,
  }
}
