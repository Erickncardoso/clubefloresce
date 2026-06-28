/** Check-in semanal (sex–seg): status, banner e popup de sexta. */
export function useWeeklyCheckInPrompt() {
  const config = useRuntimeConfig()
  const { patientFetchInit } = usePatientLocalTime()

  const checkInStatus = ref({})
  const activeTemplates = ref([])
  const fridayPromptOpen = ref(false)
  const loading = ref(false)

  function fridayPromptStorageKey() {
    const period = activeTemplates.value.find((tpl) => tpl.periodKey)?.periodKey || 'current'
    return `cf-checkin-friday-prompt:${period}`
  }

  function canOpenTemplate(tpl) {
    if (tpl.completedThisPeriod) return false
    if (tpl.frequency === 'weekly' && !checkInStatus.value.windowOpen) return false
    return true
  }

  const pendingCheckIn = computed(() =>
    activeTemplates.value.some((tpl) => canOpenTemplate(tpl)),
  )

  function shouldShowFridayPrompt() {
    if (!checkInStatus.value.showFridayPrompt) return false
    if (!pendingCheckIn.value) return false
    if (import.meta.server) return false
    return localStorage.getItem(fridayPromptStorageKey()) !== '1'
  }

  async function loadCheckInAccess() {
    loading.value = true
    try {
      const data = await $fetch(`${config.public.apiBase}/checkin/templates/active`, patientFetchInit())
      activeTemplates.value = data.templates || []
      checkInStatus.value = data.status || {}

      if (shouldShowFridayPrompt()) {
        fridayPromptOpen.value = true
      }
    } catch {
      activeTemplates.value = []
      checkInStatus.value = {}
    } finally {
      loading.value = false
    }
  }

  function dismissFridayPrompt() {
    fridayPromptOpen.value = false
    if (import.meta.client) {
      localStorage.setItem(fridayPromptStorageKey(), '1')
    }
  }

  function goToCheckIn() {
    dismissFridayPrompt()
    return navigateTo('/check-in')
  }

  return {
    checkInStatus,
    pendingCheckIn,
    fridayPromptOpen,
    loading,
    loadCheckInAccess,
    dismissFridayPrompt,
    goToCheckIn,
  }
}
