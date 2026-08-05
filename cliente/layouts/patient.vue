<template>
  <div class="patient-shell">
    <div ref="scrollRootRef" class="patient-shell-body">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { isPatientCheckoutPath } from '~/utils/patient-access'

const scrollRootRef = ref(null)
const route = useRoute()
const { hydrateProfile, syncPatientProfile } = usePatientApp()
const { fetchNotifications } = usePatientNotifications()
const { hasPatientSession } = usePatientAuth()

usePatientHorizontalWheelBridge(scrollRootRef)

onMounted(async () => {
  hydrateProfile()
  // Checkout guest: sem sessão — não dispara /auth/me nem notifications.
  if (isPatientCheckoutPath(route.path) && !hasPatientSession()) return
  if (!hasPatientSession()) return

  await syncPatientProfile()
  await fetchNotifications()
})
</script>
