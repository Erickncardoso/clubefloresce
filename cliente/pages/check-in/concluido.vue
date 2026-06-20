<template>
  <div class="patient-page done-page">
    <div class="done-hero">
      <div class="done-circle">
        <Check class="done-icon" />
      </div>
      <div class="done-emoji">🎉</div>
      <h1>Check-in concluído!</h1>
      <p>Você completou todas as perguntas da semana. Continue assim, você está indo muito bem!</p>
    </div>
    <NuxtLink to="/check-in/resumo" class="patient-btn">Ver resumo</NuxtLink>
    <NuxtLink to="/inicio" class="patient-btn patient-btn--ghost done-home">Voltar para o início</NuxtLink>
  </div>
</template>

<script setup>
import { Check } from 'lucide-vue-next'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

let redirectTimer = null

onMounted(() => {
  redirectTimer = window.setTimeout(() => {
    navigateTo('/inicio', { replace: true })
  }, 1200)
})

onBeforeUnmount(() => {
  if (redirectTimer) window.clearTimeout(redirectTimer)
})
</script>

<style scoped>
.done-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - env(safe-area-inset-bottom));
  text-align: center;
  padding: 2rem 1.25rem;
}

.done-hero {
  margin-bottom: 2rem;
}

.done-circle {
  width: 5rem;
  height: 5rem;
  margin: 0 auto 1rem;
  border-radius: 50%;
  background: var(--pa-green);
  display: flex;
  align-items: center;
  justify-content: center;
}

.done-icon {
  width: 2.5rem;
  height: 2.5rem;
  color: #fff;
}

.done-emoji {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.done-page h1 {
  margin: 0 0 0.75rem;
  font-size: 1.5rem;
  font-weight: 800;
}

.done-page p {
  margin: 0;
  font-size: 0.92rem;
  color: var(--pa-text-muted);
  line-height: 1.55;
  max-width: 18rem;
}

.done-home {
  margin-top: 0.75rem;
  text-decoration: none;
}
</style>
