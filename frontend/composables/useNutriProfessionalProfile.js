import { useAuthSession } from '~/composables/useAuthSession.js'

const STORAGE_KEY = 'cf-nutri-professional'

function readStoredProfile() {
  if (typeof window === 'undefined') return { crn: '' }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { crn: '' }
    const parsed = JSON.parse(raw)
    return { crn: String(parsed?.crn || '').trim() }
  } catch {
    return { crn: '' }
  }
}

function writeStoredProfile(profile) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      crn: String(profile?.crn || '').trim(),
    }))
  } catch {
    /* ignore */
  }
}

export function useNutriProfessionalProfile() {
  const profile = useState('nutri-professional-profile', () => ({ crn: '' }))

  if (import.meta.client && !profile.value.crn) {
    profile.value = readStoredProfile()
  }

  function setCrn(value) {
    profile.value = { crn: String(value || '').trim() }
    writeStoredProfile(profile.value)
  }

  const crn = computed({
    get: () => profile.value.crn || '',
    set: (value) => setCrn(value),
  })

  const { verifiedUser } = useAuthSession()

  const authorLine = computed(() => {
    const name = String(verifiedUser.value?.name || 'Nutricionista').trim()
    const crnValue = profile.value.crn
    if (crnValue) return `${name} — CRN ${crnValue}`
    return name
  })

  return {
    crn,
    setCrn,
    authorLine,
  }
}
