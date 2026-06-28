export type PatientGender = 'female' | 'male' | 'other' | 'prefer_not_say'

export type PatientPrimaryGoal =
  | 'lose_weight'
  | 'maintain'
  | 'gain_weight'
  | 'muscle'
  | 'health'

export type PatientWorkoutsPerWeek = '0-2' | '3-5' | '6+'

export type PatientProfileData = {
  gender?: PatientGender | null
  birthDate?: string | null
  heightCm?: number | null
  weightKg?: number | null
  targetWeightKg?: number | null
  primaryGoal?: PatientPrimaryGoal | null
  workoutsPerWeek?: PatientWorkoutsPerWeek | null
}

export type PatientProfileResponse = {
  profile: PatientProfileData
  onboardingCompletedAt: string | null
  isComplete: boolean
  missingFields: string[]
}

const EMPTY_PROFILE: PatientProfileData = {
  gender: null,
  birthDate: null,
  heightCm: null,
  weightKg: null,
  targetWeightKg: null,
  primaryGoal: null,
  workoutsPerWeek: null,
}

export function usePatientOnboarding() {
  const config = useRuntimeConfig()
  const patientAuth = usePatientAuth()

  const loaded = useState('patient-onboarding-loaded', () => false)
  const isComplete = useState('patient-onboarding-complete', () => false)
  const profile = useState<PatientProfileData>('patient-onboarding-profile', () => ({ ...EMPTY_PROFILE }))
  const missingFields = useState<string[]>('patient-onboarding-missing', () => [])

  function applyResponse(data: PatientProfileResponse) {
    profile.value = { ...EMPTY_PROFILE, ...(data.profile || {}) }
    isComplete.value = Boolean(data.isComplete)
    missingFields.value = Array.isArray(data.missingFields) ? data.missingFields : []
    loaded.value = true
  }

  async function fetchStatus({ force = false } = {}) {
    if (loaded.value && !force) {
      return {
        isComplete: isComplete.value,
        profile: profile.value,
        missingFields: missingFields.value,
      }
    }

    patientAuth.bootstrapToken()
    if (!patientAuth.hasPatientSession()) {
      loaded.value = true
      isComplete.value = false
      return null
    }

    const data = await $fetch<PatientProfileResponse>(
      `${config.public.apiBase}/patient-profile/me`,
      patientAuth.authFetchInit(),
    )

    applyResponse(data)
    return data
  }

  async function saveProfile(partial: Partial<PatientProfileData>, { complete = false } = {}) {
    patientAuth.bootstrapToken()

    const data = await $fetch<PatientProfileResponse>(
      `${config.public.apiBase}/patient-profile/me`,
      patientAuth.authFetchInit({
        method: 'PUT',
        body: { ...partial, complete },
      }),
    )

    applyResponse(data)
    profile.value = { ...profile.value, ...partial }
    return data
  }

  function needsOnboarding() {
    return loaded.value && !isComplete.value
  }

  function resetOnboardingState() {
    loaded.value = false
    isComplete.value = false
    profile.value = { ...EMPTY_PROFILE }
    missingFields.value = []
  }

  async function resolvePostLoginRoute(defaultRoute = '/inicio') {
    const data = await fetchStatus({ force: true })
    if (!data?.isComplete) return '/onboarding'
    return defaultRoute
  }

  return {
    loaded,
    isComplete,
    profile,
    missingFields,
    fetchStatus,
    saveProfile,
    needsOnboarding,
    resetOnboardingState,
    resolvePostLoginRoute,
  }
}
