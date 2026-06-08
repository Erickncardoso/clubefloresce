import { getLocalDateKey, getPatientTimeZone } from '~/utils/local-date'

export function usePatientLocalTime() {
  function patientTimeHeaders(extra = {}) {
    const headers = { ...extra }

    if (!import.meta.server) {
      headers['X-Patient-Timezone'] = getPatientTimeZone()
      headers['X-Patient-Date'] = getLocalDateKey()

      const token = localStorage.getItem('auth_token')
      if (token) headers.Authorization = `Bearer ${token}`
    }

    return headers
  }

  return {
    getLocalDateKey,
    getPatientTimeZone,
    patientTimeHeaders,
  }
}
