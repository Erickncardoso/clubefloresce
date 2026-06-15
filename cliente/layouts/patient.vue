<template>
  <div class="patient-shell">
    <AppToast />
    <div ref="scrollRootRef" class="patient-shell-body">
      <slot />
    </div>
  </div>
</template>

<script setup>
const scrollRootRef = ref(null)
const { hydrateProfile, syncPatientProfile } = usePatientApp()
const { hasUnread, fetchNotifications } = usePatientNotifications()

usePatientHorizontalWheelBridge(scrollRootRef)

onMounted(async () => {
  hydrateProfile()
  await syncPatientProfile()
  await fetchNotifications()
})
</script>
