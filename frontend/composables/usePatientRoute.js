import { authFetchInit } from '~/composables/useAuthSession.js'
import {
  buildPatientPath,
  getPatientUrlSlug,
  isUuid,
  patientRouteSuffixFromPath,
} from '~/utils/patient-slug.js'

export function usePatientRoute() {
  const route = useRoute()
  const router = useRouter()
  const apiBase = useApiBase()

  const routeParam = computed(() => decodeURIComponent(String(route.params.id || '').trim()))
  const patientId = ref('')
  const resolvingRoute = ref(true)
  const routeError = ref('')

  async function resolveRouteParam() {
    resolvingRoute.value = true
    routeError.value = ''
    const param = routeParam.value
    if (!param) {
      patientId.value = ''
      resolvingRoute.value = false
      return
    }
    if (isUuid(param)) {
      patientId.value = param
      resolvingRoute.value = false
      return
    }
    try {
      const user = await $fetch(
        `${apiBase.value}/users/${encodeURIComponent(param)}`,
        authFetchInit(),
      )
      patientId.value = String(user?.id || '')
      if (!patientId.value) {
        routeError.value = 'Paciente não encontrado.'
      }
    } catch (err) {
      patientId.value = ''
      routeError.value = err?.data?.error || err?.data?.message || 'Paciente não encontrado.'
    } finally {
      resolvingRoute.value = false
    }
  }

  function buildCurrentPatientPath(user, patients = null) {
    const suffix = patientRouteSuffixFromPath(route.path, routeParam.value)
    return buildPatientPath(user, {
      suffix,
      query: route.query,
      patients,
    })
  }

  async function syncCanonicalPatientUrl(user, patients = null) {
    if (!user?.id) return
    const slug = getPatientUrlSlug(user, patients)
    if (!slug || routeParam.value === slug) return
    const target = buildCurrentPatientPath(user, patients)
    await router.replace(target)
  }

  watch(routeParam, resolveRouteParam, { immediate: true })

  return {
    routeParam,
    patientId,
    resolvingRoute,
    routeError,
    resolveRouteParam,
    buildCurrentPatientPath,
    syncCanonicalPatientUrl,
    buildPatientPath,
    getPatientUrlSlug,
  }
}
