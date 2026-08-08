import { getLocalDateKey, getPatientTimeZone } from '~/utils/local-date'
import { authFetchInit, authHeaders } from '~/composables/useAuthSession.js'

function applyPatientTimezoneHeaders(headers) {
  if (!import.meta.server) {
    headers.set('X-Patient-Timezone', getPatientTimeZone())
    headers.set('X-Patient-Date', getLocalDateKey())
  }
  return headers
}

export function patientFetchInit(init = {}) {
  const timezoneHeaders = {}
  if (!import.meta.server) {
    timezoneHeaders['X-Patient-Timezone'] = getPatientTimeZone()
    timezoneHeaders['X-Patient-Date'] = getLocalDateKey()
  }
  const baseHeaders = init.headers || {}
  const headers = baseHeaders instanceof Headers
    ? (() => {
      const merged = new Headers(baseHeaders)
      Object.entries(timezoneHeaders).forEach(([key, value]) => merged.set(key, value))
      return merged
    })()
    : { ...timezoneHeaders, ...baseHeaders }
  return authFetchInit({ ...init, headers })
}

export function usePatientLocalTime() {
  function patientTimeHeaders(extra = {}) {
    return Object.fromEntries(applyPatientTimezoneHeaders(authHeaders(extra)).entries())
  }

  return {
    getLocalDateKey,
    getPatientTimeZone,
    patientTimeHeaders,
    patientFetchInit,
  }
}
