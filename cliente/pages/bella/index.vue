<template>
  <div class="patient-page bella-page patient-page--with-tab">
    <PatientHeader show-back back-to="/inicio" :show-bell="false" />

    <header class="bella-hero">
      <div class="bella-avatar" aria-hidden="true">
        <Sparkles class="bella-avatar-icon" />
      </div>
      <h1 class="bella-title">Bella IA</h1>
      <p class="bella-subtitle">Sua nutricionista inteligente</p>
    </header>

    <p class="bella-prompt">Como posso te ajudar hoje?</p>

    <section class="bella-actions" aria-label="Atalhos da Bella">
      <div class="bella-grid">
        <button
          v-for="action in actions"
          :key="action.id"
          type="button"
          class="bella-action cf-squircle cf-squircle--tile"
          @click="handleAction(action)"
        >
          <span class="bella-action-icon-wrap" aria-hidden="true">
            <component :is="action.icon" class="bella-action-icon" />
          </span>
          <span class="bella-action-label">{{ action.label }}</span>
        </button>
      </div>
    </section>

    <NuxtLink to="/bella/chat/general" class="bella-chat-link cf-btn cf-btn--pink">
      Iniciar conversa
    </NuxtLink>
  </div>
</template>

<script setup>
import { Sparkles } from 'lucide-vue-next'
import { BELLA_ACTIONS, navigateBellaAction } from '~/utils/bella-actions'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const actions = BELLA_ACTIONS

function handleAction(action) {
  navigateBellaAction(action)
}

onMounted(() => {
  if (localStorage.getItem('user_role') === 'NUTRICIONISTA') navigateTo('/cursos')
})
</script>

<style scoped>
.patient-page.bella-page {
  padding-inline: 1.25rem;
  padding-top: 0;
  min-height: 100%;
  box-sizing: border-box;
}

.bella-hero {
  text-align: center;
  padding: 0.25rem 0 1.5rem;
}

.bella-avatar {
  width: 5rem;
  height: 5rem;
  margin: 0 auto 1rem;
  border-radius: 50%;
  background: var(--cf-pink-soft);
  border: 2px solid #f5dfe1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--cf-shadow);
}

.bella-avatar-icon {
  width: 2rem;
  height: 2rem;
  color: var(--cf-pink);
}

.bella-title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.2;
  color: var(--cf-text);
  text-wrap: balance;
}

.bella-subtitle {
  margin: 0.35rem 0 0;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
}

.bella-prompt {
  margin: 0 0 1.25rem;
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.45;
  text-align: center;
  color: var(--cf-text);
  text-wrap: balance;
}

.bella-actions {
  margin-bottom: 1.5rem;
}

.bella-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.bella-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  min-height: 6.25rem;
  padding: 1rem 0.75rem;
  border: 1px solid var(--cf-border);
  background: var(--cf-surface);
  box-shadow: var(--cf-shadow);
  font-family: inherit;
  cursor: pointer;
  text-align: center;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease;
}

.bella-action:hover {
  border-color: #e8d4d6;
  background: #fffbfc;
}

.bella-action:active {
  transform: scale(0.98);
  background: var(--cf-pink-soft);
}

.bella-action:focus-visible {
  outline: 2px solid var(--cf-pink);
  outline-offset: 2px;
}

.bella-action-icon-wrap {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: var(--cf-pink-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bella-action-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--cf-pink-dark);
}

.bella-action-label {
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.35;
  color: var(--cf-text);
}

.bella-chat-link {
  text-decoration: none;
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

@media (prefers-reduced-motion: reduce) {
  .bella-action {
    transition: none;
  }

  .bella-action:active {
    transform: none;
  }
}
</style>
