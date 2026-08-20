<template>
  <div class="patient-page bella-page patient-page--with-tab">
    <PatientHeader />

    <main class="bella-landing">
      <header class="bella-hero">
        <div class="bella-avatar-wrap">
          <div class="bella-avatar">
            <img
              src="/falecomabella.webp"
              alt="Bella, assistente virtual do Clube Florescer"
              class="bella-avatar-img"
              width="76"
              height="76"
              fetchpriority="high"
            />
          </div>
          <span class="bella-avatar-badge" aria-hidden="true">
            <Sparkles class="bella-avatar-badge-icon" />
          </span>
        </div>

        <p class="bella-greeting">Olá, {{ firstName }}!</p>
        <h1 class="bella-headline">O que vamos analisar hoje?</h1>
        <p class="bella-intro">
          Escolha uma opção abaixo ou converse comigo sobre alimentação.
        </p>
      </header>

      <section class="bella-actions" aria-labelledby="bella-actions-title">
        <div class="bella-section-heading">
          <div>
            <p class="bella-section-kicker">Atalhos</p>
            <h2 id="bella-actions-title">Como posso ajudar?</h2>
          </div>
          <span>Toque para começar</span>
        </div>

        <div class="bella-actions-grid">
          <button
            v-for="action in actions"
            :key="action.id"
            type="button"
            class="bella-action"
            :class="{ 'bella-action--wide': action.id === 'ask' }"
            @click="handleAction(action)"
          >
            <span class="bella-action-icon-wrap" aria-hidden="true">
              <component :is="action.icon" class="bella-action-icon" />
            </span>
            <span class="bella-action-copy">
              <strong>{{ action.label }}</strong>
              <small>{{ actionDescriptions[action.id] }}</small>
            </span>
          </button>
        </div>
      </section>

      <div class="bella-cta-area">
        <p class="bella-cta-label">Prefere escrever?</p>
        <NuxtLink
          to="/bella/chat/general"
          class="bella-cta-input"
          aria-label="Abrir conversa com a Bella"
        >
          <span class="bella-cta-placeholder">Pergunte algo para a Bella</span>
          <span class="bella-cta-actions">
            <span class="bella-cta-attach" aria-hidden="true">
              <Paperclip class="bella-cta-icon" />
            </span>
            <span class="bella-cta-send" aria-hidden="true">
              <ArrowUp class="bella-cta-send-icon" />
            </span>
          </span>
        </NuxtLink>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ArrowUp, Paperclip, Sparkles } from 'lucide-vue-next'
import { BELLA_ACTIONS, navigateBellaAction } from '~/utils/bella-actions'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const { userName } = usePatientApp()
const firstName = computed(() => userName())
const actions = BELLA_ACTIONS
const actionDescriptions = {
  label: 'Entenda os ingredientes',
  meal: 'Analise uma foto',
  restaurant: 'Escolha melhor',
  swap: 'Veja opções equivalentes',
  diet: 'Consulte seu plano',
  ask: 'Tire uma dúvida com a Bella',
}

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
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background: #f7f7f5;
}

.bella-page :deep(.cf-header) {
  flex-shrink: 0;
  background: #fff;
  border-bottom: 1px solid rgba(26, 26, 26, 0.06);
}

.bella-landing {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-height: 0;
  flex: 1;
  padding: 0 1rem 1.25rem;
  background: #f7f7f5;
}

/* Hero */
.bella-hero {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 1.65rem 0 1.4rem;
}

.bella-avatar-wrap {
  position: relative;
  display: inline-flex;
  margin-bottom: 0.85rem;
}

.bella-avatar {
  width: 4.75rem;
  height: 4.75rem;
  border-radius: 1.35rem;
  background: #fff;
  border: 1px solid var(--cf-border);
  box-shadow: 0 8px 24px rgba(35, 42, 31, 0.08);
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
  bottom: -0.25rem;
  right: -0.25rem;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: var(--cf-green);
  border: 3px solid #f7f7f5;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 10px rgba(111, 120, 99, 0.3);
}

.bella-avatar-badge-icon {
  width: 0.8rem;
  height: 0.8rem;
  color: #fff;
}

.bella-greeting {
  margin: 0 0 0.25rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--cf-green-dark);
}

.bella-headline {
  max-width: 20rem;
  margin: 0 auto;
  font-size: clamp(1.65rem, 7vw, 1.9rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.12;
  color: var(--cf-text);
  text-wrap: balance;
}

.bella-intro {
  max-width: 20rem;
  margin: 0.55rem auto 0;
  color: var(--cf-text-muted);
  font-size: 0.82rem;
  line-height: 1.5;
  text-wrap: balance;
}

/* Ações rápidas */
.bella-actions {
  position: relative;
  z-index: 1;
  width: 100%;
}

.bella-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.7rem;
  padding: 0 0.15rem;
}

.bella-section-kicker {
  margin: 0 0 0.05rem;
  color: var(--cf-green-dark);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  line-height: 1.3;
  text-transform: uppercase;
}

.bella-section-heading h2 {
  margin: 0;
  color: var(--cf-text);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35;
}

.bella-section-heading > span {
  color: var(--cf-text-muted);
  font-size: 0.7rem;
  white-space: nowrap;
}

.bella-actions-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.bella-action {
  min-width: 0;
  min-height: 4.5rem;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem;
  text-align: left;
  border-radius: 1rem;
  border: 1px solid var(--cf-border);
  background: #fff;
  color: var(--cf-text);
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(35, 42, 31, 0.035);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}

.bella-action--wide {
  grid-column: 1 / -1;
}

.bella-action-icon-wrap {
  flex: 0 0 auto;
  width: 2.35rem;
  height: 2.35rem;
  display: grid;
  place-items: center;
  border-radius: 0.75rem;
  background: var(--cf-green-soft);
  color: var(--cf-green-dark);
}

.bella-action-icon {
  width: 1.05rem;
  height: 1.05rem;
  stroke-width: 1.85;
}

.bella-action-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.bella-action-copy strong {
  color: var(--cf-text);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.25;
}

.bella-action-copy small {
  color: var(--cf-text-muted);
  font-size: 0.68rem;
  line-height: 1.3;
}

.bella-action:active {
  transform: scale(0.98);
  border-color: var(--cf-green);
  box-shadow: 0 4px 14px rgba(111, 120, 99, 0.12);
}

.bella-action:focus-visible,
.bella-cta-input:focus-visible {
  outline: 2px solid var(--cf-green-dark);
  outline-offset: 2px;
}

/* Entrada principal de conversa */
.bella-cta-area {
  position: relative;
  z-index: 1;
  width: 100%;
  margin-top: auto;
  padding-top: 1.15rem;
}

.bella-cta-label {
  margin: 0 0 0.45rem 0.15rem;
  color: var(--cf-text-muted);
  font-size: 0.7rem;
  font-weight: 600;
}

.bella-cta-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 3.75rem;
  padding: 0.55rem 0.55rem 0.55rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--cf-border);
  background: #fff;
  text-decoration: none;
  box-shadow: 0 5px 20px rgba(35, 42, 31, 0.07);
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.bella-cta-input:active {
  border-color: var(--cf-green);
  box-shadow: 0 6px 22px rgba(111, 120, 99, 0.13);
}

.bella-cta-placeholder {
  flex: 1;
  min-width: 0;
  font-size: 0.82rem;
  color: var(--cf-text-muted);
  font-weight: 500;
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
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: var(--cf-green);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 10px rgba(111, 120, 99, 0.28);
}

.bella-cta-send-icon {
  width: 1rem;
  height: 1rem;
  color: #fff;
  stroke-width: 2.25;
}

@media (hover: hover) {
  .bella-action:hover,
  .bella-cta-input:hover {
    border-color: color-mix(in srgb, var(--cf-green) 55%, var(--cf-border));
    box-shadow: 0 6px 18px rgba(111, 120, 99, 0.1);
  }
}

@media (max-height: 760px) {
  .bella-hero {
    padding-block: 1rem;
  }

  .bella-avatar {
    width: 4rem;
    height: 4rem;
  }

  .bella-intro {
    margin-top: 0.35rem;
  }

  .bella-action {
    min-height: 4.15rem;
  }
}

@media (max-width: 350px) {
  .bella-section-heading > span,
  .bella-action-copy small {
    display: none;
  }

  .bella-action {
    min-height: 3.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bella-action,
  .bella-cta-input {
    transition: none;
  }

  .bella-action:active {
    transform: none;
  }
}
</style>
