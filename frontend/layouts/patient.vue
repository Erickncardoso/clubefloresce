<template>
  <div class="patient-shell">
    <div class="patient-shell-body">
      <slot />
    </div>
  </div>
</template>

<script setup>
const { hydrateProfile, syncPatientProfile } = usePatientApp()

onMounted(async () => {
  hydrateProfile()
  await syncPatientProfile()
})
</script>
