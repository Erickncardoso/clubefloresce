<template>
  <Teleport to="body">
    <Transition name="premium-gate-fade">
      <div
        v-if="open"
        class="premium-gate-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-gate-title"
        @click.self="closeGate"
      >
        <div class="premium-gate cf-squircle">
          <div class="premium-gate-icon-wrap" aria-hidden="true">
            <Lock class="premium-gate-icon" />
          </div>

          <h2 id="premium-gate-title" class="premium-gate-title">
            Plano Free
          </h2>
          <p class="premium-gate-copy">
            Você está no plano gratuito e não tem acesso
            <template v-if="featureLabel"> à {{ featureLabel }}</template>.
            Faça upgrade para o Essencial ou Completo para liberar.
          </p>

          <div class="premium-gate-actions">
            <button type="button" class="premium-gate-btn premium-gate-btn--ghost" @click="closeGate">
              Entendi
            </button>
            <button type="button" class="premium-gate-btn" @click="goCheckout">
              Ver planos
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { Lock } from 'lucide-vue-next'
import { usePatientPremiumGate } from '~/composables/usePatientPremiumGate'
import { getPatientCheckoutUrl } from '~/utils/patient-checkout-url.mjs'
import { openUrlInSystemBrowser } from '~/utils/pwa-standalone'

const { open, featureLabel, closeGate } = usePatientPremiumGate()

function goCheckout() {
  // Produção → /assinatura (página de planos). Síncrono no toque p/ abrir Safari no iOS PWA.
  const url = getPatientCheckoutUrl('premium-gate')
  closeGate()
  if (import.meta.client) {
    openUrlInSystemBrowser(url)
    return
  }
  void navigateTo('/assinatura')
}

watch(
  open,
  (isOpen) => {
    if (!import.meta.client) return
    document.body.style.overflow = isOpen ? 'hidden' : ''
  },
  { immediate: true },
)

onUnmounted(() => {
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<style scoped>
.premium-gate-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--cf-z-gate, 7000);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
}

.premium-gate {
  width: 100%;
  max-width: 20rem;
  padding: 1.25rem 1.1rem 1.1rem;
  background: var(--cf-surface, #fff);
  border: 1px solid var(--cf-border, #e5e5ea);
  box-shadow: var(--cf-shadow-lg, 0 12px 40px rgba(0, 0, 0, 0.18));
  text-align: center;
}

.premium-gate-icon-wrap {
  width: 2.75rem;
  height: 2.75rem;
  margin: 0 auto 0.75rem;
  border-radius: 50%;
  background: var(--cf-pink-soft, #eef1eb);
  display: flex;
  align-items: center;
  justify-content: center;
}

.premium-gate-icon {
  width: 1.2rem;
  height: 1.2rem;
  color: var(--cf-pink, #8b967c);
}

.premium-gate-title {
  margin: 0 0 0.45rem;
  font-size: 1rem;
  font-weight: 800;
  color: var(--cf-text, #1f211c);
}

.premium-gate-copy {
  margin: 0 0 0.95rem;
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--cf-text-muted, #6f7863);
}

.premium-gate-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.premium-gate-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 2.5rem;
  padding: 0.55rem 0.75rem;
  border: none;
  border-radius: var(--cf-radius-control, 12px);
  background: var(--cf-pink, #8b967c);
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
}

.premium-gate-btn--ghost {
  background: transparent;
  color: var(--cf-text, #1f211c);
  border: 1px solid var(--cf-border, #e5e5ea);
}

.premium-gate-btn:active {
  transform: scale(0.98);
}

.premium-gate-fade-enter-active,
.premium-gate-fade-leave-active {
  transition: opacity 0.18s ease;
}

.premium-gate-fade-enter-active .premium-gate,
.premium-gate-fade-leave-active .premium-gate {
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.premium-gate-fade-enter-from,
.premium-gate-fade-leave-to {
  opacity: 0;
}

.premium-gate-fade-enter-from .premium-gate,
.premium-gate-fade-leave-to .premium-gate {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
</style>
