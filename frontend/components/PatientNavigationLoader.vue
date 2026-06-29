<template>
  <Teleport to="body">
    <div
      v-if="isNavigating"
      class="cf-nav-loader"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando página"
    >
      <PatientLoadingLogo size="lg" animated />
    </div>
  </Teleport>
</template>

<script setup>
import { onMounted } from 'vue'
import { usePatientNavigationLoading } from '~/composables/usePatientNavigationLoading'

const { isNavigating, finishNavigation } = usePatientNavigationLoading()

onMounted(() => {
  // iOS / link de e-mail: garante que overlay branco não fique preso
  finishNavigation()
})
</script>

<style scoped>
.cf-nav-loader {
  position: fixed;
  inset: 0;
  z-index: 7500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(4px);
}
</style>
