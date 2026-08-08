<template>
  <div
    v-if="quickDialOpen"
    class="patient-screen-dim patient-screen-dim--interactive"
    aria-hidden="true"
    @click="onClick"
  />
</template>

<script setup>
const { open: quickDialOpen, close: closeQuickDial } = usePatientQuickAccess()

function onClick() {
  closeQuickDial()
}
</script>
