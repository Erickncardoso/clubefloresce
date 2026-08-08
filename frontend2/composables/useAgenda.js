import { authHeaders } from '~/composables/useAuthSession.js'

export function useAgenda() {
  const config = useRuntimeConfig()
  const base = computed(() => `${config.public.apiBase}/agenda`)

  async function fetchAppointments({ from, to } = {}) {
    return $fetch(`${base.value}/appointments`, {
      headers: authHeaders(),
      query: { from, to },
    })
  }

  async function searchAppointments(query, limit = 20) {
    return $fetch(`${base.value}/search`, {
      headers: authHeaders(),
      query: { q: query, limit },
    })
  }

  async function createAppointment(payload) {
    return $fetch(`${base.value}/appointments`, {
      method: 'POST',
      headers: authHeaders(),
      body: payload,
    })
  }

  async function updateAppointment(id, payload) {
    return $fetch(`${base.value}/appointments/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: payload,
    })
  }

  async function deleteAppointment(id) {
    return $fetch(`${base.value}/appointments/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
  }

  return {
    fetchAppointments,
    searchAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  }
}
