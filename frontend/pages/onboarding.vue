<template>
  <div class="onboarding-page">
    <div class="onboarding-dots">
      <span v-for="n in 3" :key="n" :class="{ active: step === n - 1 }" />
    </div>

    <div class="onboarding-content">
      <div v-if="step === 0" class="onboarding-slide">
        <div class="onboarding-illus onboarding-illus--1">🌱</div>
        <h1>Tudo o que você precisa para alcançar seus objetivos</h1>
        <ul class="onboarding-features">
          <li><Leaf class="feat-icon" /> Conteúdos exclusivos de nutrição</li>
          <li><CalendarCheck class="feat-icon" /> Check-in semanal de evolução</li>
          <li><Sparkles class="feat-icon" /> BELLA, sua IA nutricional 24h</li>
          <li><Users class="feat-icon" /> Comunidade de apoio entre pacientes</li>
        </ul>
      </div>

      <div v-else-if="step === 1" class="onboarding-slide">
        <div class="onboarding-illus onboarding-illus--2">💬</div>
        <h1>Conheça a Bella, sua IA nutricional</h1>
        <p>Leia rótulos, tire dúvidas, analise PDFs e receba orientações personalizadas — disponível 24h.</p>
      </div>

      <div v-else class="onboarding-slide">
        <div class="onboarding-illus onboarding-illus--3">📚</div>
        <h1>Aprenda, evolua, compartilhe</h1>
        <p>Acesse vídeos, cursos e ebooks. Faça seu check-in semanal e conecte-se com outros pacientes.</p>
      </div>
    </div>

    <div class="onboarding-actions">
      <button v-if="step > 0" type="button" class="patient-btn patient-btn--ghost" @click="step--">Voltar</button>
      <button type="button" class="patient-btn" @click="next">
        {{ step === 2 ? 'Começar agora' : 'Próximo' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { CalendarCheck, Leaf, Sparkles, Users } from 'lucide-vue-next'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const step = ref(0)

function next() {
  if (step.value < 2) {
    step.value++
    return
  }
  localStorage.setItem('patient_onboarding_done', '1')
  navigateTo('/inicio')
}
</script>

<style scoped>
.onboarding-page {
  min-height: 100vh;
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  padding: calc(1.5rem + env(safe-area-inset-top)) 1.5rem calc(1.5rem + env(safe-area-inset-bottom));
  background: #fff;
}

.onboarding-dots {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.onboarding-dots span {
  width: 2rem;
  height: 4px;
  border-radius: 999px;
  background: #e5e7eb;
}

.onboarding-dots span.active {
  background: var(--pa-green, #006437);
}

.onboarding-content {
  flex: 1;
  display: flex;
  align-items: center;
}

.onboarding-slide {
  width: 100%;
}

.onboarding-illus {
  font-size: 4rem;
  text-align: center;
  margin-bottom: 1.5rem;
  width: 8rem;
  height: 8rem;
  margin-left: auto;
  margin-right: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--pa-green-muted, #f0fdf4);
}

.onboarding-slide h1 {
  font-size: 1.65rem;
  font-weight: 800;
  line-height: 1.25;
  margin: 0 0 1rem;
  letter-spacing: -0.02em;
  text-align: center;
}

.onboarding-slide p {
  text-align: center;
  color: var(--pa-text-muted, #6b7280);
  line-height: 1.55;
  margin: 0;
}

.onboarding-features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.onboarding-features li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--pa-text, #111);
}

.feat-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--pa-green, #006437);
  flex-shrink: 0;
}

.onboarding-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1.5rem;
}
</style>
