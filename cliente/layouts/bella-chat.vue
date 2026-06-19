<template>
  <div class="patient-shell bella-chat-shell">
    <div class="patient-shell-body bella-chat-shell-body">
      <slot />
    </div>
  </div>
</template>

<script setup>
const { hydrateProfile, syncPatientProfile } = usePatientApp()
const { fetchNotifications } = usePatientNotifications()

onMounted(async () => {
  hydrateProfile()
  await syncPatientProfile()
  await fetchNotifications()
})
</script>
