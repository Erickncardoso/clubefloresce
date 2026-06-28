<template>
  <div class="patient-page bella-page patient-page--with-tab">
    <PatientHeader show-back back-to="/inicio" :show-bell="false" />

    <div class="bella-landing">
      <header class="bella-hero">
        <div class="bella-avatar-wrap">
          <div class="bella-avatar" aria-hidden="true">
            <img src="/falecomabella.webp" alt="" class="bella-avatar-img" width="72" height="72" />
          </div>
          <span class="bella-avatar-badge">
            <Sparkles class="bella-avatar-badge-icon" />
          </span>
        </div>

        <p class="bella-greeting">Olá, {{ firstName }}!</p>
        <h1 class="bella-headline">O que vamos<br>analisar hoje?</h1>
      </header>

      <section class="bella-chips" aria-label="Atalhos da Bella">
        <button
          v-for="action in actions"
          :key="action.id"
          type="button"
          class="bella-chip"
          @click="handleAction(action)"
        >
          <component :is="action.icon" class="bella-chip-icon" />
          <span>{{ action.label }}</span>
        </button>
      </section>

      <div class="bella-cta-area">
        <NuxtLink to="/bella/chat/general" class="bella-cta-input">
          <span class="bella-cta-placeholder">Pergunte algo para a Bella...</span>
          <span class="bella-cta-actions">
            <span class="bella-cta-attach">
              <Paperclip class="bella-cta-icon" />
            </span>
            <span class="bella-cta-send">
              <ArrowUp class="bella-cta-send-icon" />
            </span>
          </span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ArrowUp, Paperclip, Sparkles } from 'lucide-vue-next'
import { BELLA_ACTIONS, navigateBellaAction } from '~/utils/bella-actions'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const { userName } = usePatientApp()
const firstName = computed(() => userName())
const actions = BELLA_ACTIONS

function handleAction(action) {
  navigateBellaAction(action)
}

onMounted(async () => {
  const { ensurePatientSession } = usePatientAuth()
  await ensurePatientSession()
  if (getVerifiedRole() === 'NUTRICIONISTA') navigateTo('/cursos')
})
</script>

<style scoped>
.patient-page.bella-page {
  padding-inline: 0;
  padding-top: 0;
  min-height: 100%;
  box-sizing: border-box;
  background: #f8f8fa;
}

.bella-landing {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 0;
  flex: 1;
  padding: 0 1.5rem;
  overflow: hidden;
  background: linear-gradient(180deg, #fff 0%, #f8f8fa 38%, #f5f4f6 100%);
}

/* Hero */
.bella-hero {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 2.5rem 0 2rem;
}

.bella-avatar-wrap {
  position: relative;
  display: inline-flex;
  margin-bottom: 1.5rem;
}

.bella-avatar {
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 1.25rem;
  background: #fff;
  border: 1px solid var(--cf-border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bella-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
}

.bella-avatar-badge {
  position: absolute;
  bottom: -0.35rem;
  right: -0.35rem;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  background: var(--cf-pink);
  border: 2.5px solid #f8f8fa;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(193, 123, 128, 0.3);
}

.bella-avatar-badge-icon {
  width: 0.75rem;
  height: 0.75rem;
  color: #fff;
}

.bella-greeting {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--cf-text-muted);
  letter-spacing: -0.01em;
}

.bella-headline {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1.15;
  color: var(--cf-text);
}

/* Chips */
.bella-chips {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  padding: 0 0.25rem;
  margin-bottom: 2rem;
}

.bella-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--cf-border);
  background: #fff;
  color: var(--cf-text);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.bella-chip:active {
  transform: scale(0.97);
  border-color: var(--cf-pink);
  box-shadow: 0 2px 12px rgba(193, 123, 128, 0.15);
}

.bella-chip-icon {
  width: 0.95rem;
  height: 0.95rem;
  color: var(--cf-pink);
  stroke-width: 1.85;
}

/* CTA input bar (fake, links to chat) */
.bella-cta-area {
  position: relative;
  z-index: 1;
  width: 100%;
  margin-top: auto;
  padding-bottom: 1.5rem;
}

.bella-cta-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 0.65rem 0.75rem 1.15rem;
  border-radius: 999px;
  border: 1px solid var(--cf-border);
  background: #fff;
  text-decoration: none;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.bella-cta-input:active {
  border-color: var(--cf-pink);
  box-shadow: 0 4px 20px rgba(193, 123, 128, 0.12);
}

.bella-cta-placeholder {
  flex: 1;
  font-size: 0.85rem;
  color: var(--cf-text-muted);
  font-weight: 400;
}

.bella-cta-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.bella-cta-attach {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bella-cta-icon {
  width: 1rem;
  height: 1rem;
  color: var(--cf-text-muted);
  stroke-width: 1.75;
}

.bella-cta-send {
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 50%;
  background: var(--cf-pink);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(193, 123, 128, 0.3);
}

.bella-cta-send-icon {
  width: 1rem;
  height: 1rem;
  color: #fff;
  stroke-width: 2.25;
}

@media (prefers-reduced-motion: reduce) {
  .bella-chip,
  .bella-cta-input {
    transition: none;
  }

  .bella-chip:active {
    transform: none;
  }
}
</style>
